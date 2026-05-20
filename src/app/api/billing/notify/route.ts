// /api/billing/notify — V2 출시 알림 신청 (외부 메일 서비스 위임).
// SPEC §05.6 알림 신청 + §05.7.5 외부 메일 서비스 위임 정책.
//
// 정책 (2026-05-20 갱신 — Codex review round 2·3·5 fix):
// - 본 서버는 이메일을 저장하지 않는다. Resend 에 즉시 위임 후 변수 폐기.
// - Zod `.strict()` 적용 — 정의되지 않은 필드 동봉 시 422 (PII 누수 차단).
// - 응답 후 `email` 변수는 함수 스코프 종료와 함께 GC. DB·KV·파일·로그 어디에도 잔존 X.
// - **round 3 추가 가드** (Codex 지적 #2):
//   · same-origin 검증: `Origin`·`Referer` 헤더가 본 사이트 origin 일치해야 함. 외부 도메인 거부.
//   · rate limit: IP 별 1분 5회 + 1시간 10회. 인메모리 sliding window (인프라 의존 0).
// - **round 3 추가 분기** (Codex 지적 #1):
//   · Resend 4xx + "already"/"exists" 또는 409 → idempotent success (사용자에게 ok).
// - **round 5 fail-closed** (Codex 지적 #1):
//   · IP 추출 실패 시 `"anonymous"` 전역 버킷 fallback 제거. 식별 불가 → 즉시 400 거부.
//     (전역 anonymous 버킷은 정상 사용자 간 간섭을 유발 — fail-closed 가 옳다.)
//
// 응답 코드 정책:
//   200 — Resend 위임 성공 (신규 또는 중복=idempotent)
//   400 — invalid JSON 또는 IP 식별 불가 (배포 설정 문제 노출)
//   403 — same-origin 위반 (외부 도메인 호출)
//   422 — schema 검증 실패 (추가 필드·잘못된 이메일 형식)
//   429 — rate limit 초과
//   502 — Resend 외부 호출 실패 (4xx validation·auth, 5xx 등)
//   503 — Resend secret 미설정 (외부 의존성 단절)

import { NextResponse } from "next/server";
import { BillingNotifySignupSchema } from "@/lib/core";
import { delegateNotifySignupToResend } from "@/lib/server/billing/resend-client";
import { checkRateLimits, extractClientIp } from "@/lib/server/rate-limit";

/**
 * 본 사이트 origin 목록. 환경별로 허용 origin 이 다르므로 env 우선, 없으면 host 헤더 기반.
 *
 * 정책:
 * - production: `NEXT_PUBLIC_SITE_ORIGIN` 또는 Vercel 자동 주입 (`VERCEL_URL`) 으로 set
 * - dev/test: localhost·127.0.0.1 자동 허용 (request.url 의 host 와 일치)
 */
function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // origin·referer 둘 다 없으면 same-origin 보장 못함 → 거부.
  // 단, 일부 클라이언트(curl·서버 측 호출 등)는 origin 없이도 정상 — 본 라우트는
  // 브라우저 폼 전용이므로 둘 중 하나라도 있어야 한다.
  if (!origin && !referer) return false;

  const allowedOrigins = collectAllowedOrigins(request);

  if (origin) {
    return allowedOrigins.has(origin);
  }
  // referer 만 있을 때: URL 파싱 후 origin 추출.
  try {
    const refererOrigin = new URL(referer!).origin;
    return allowedOrigins.has(refererOrigin);
  } catch {
    return false;
  }
}

function collectAllowedOrigins(request: Request): Set<string> {
  const set = new Set<string>();

  // 1) 명시 env (운영·preview).
  const explicit = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (explicit) set.add(explicit.replace(/\/$/, ""));

  // 2) Vercel 자동 주입.
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) set.add(`https://${vercelUrl}`);

  // 3) request 자신의 origin (브라우저가 같은 호스트로 요청 보낸 경우 정상).
  //    Next.js 가 request.url 을 절대 URL 로 제공하므로 host 일치성을 자동 확보.
  try {
    set.add(new URL(request.url).origin);
  } catch {
    // 무시 — request.url 파싱 실패는 거의 없음.
  }

  return set;
}

/**
 * Rate limit rule — IP 별 1분 5회 + 1시간 10회.
 *
 * 정당한 사용자 시나리오(오타 수정·재시도)는 1분 5회 안에서 충분히 흡수.
 * abuser 가 1시간 10회로 캡 → Resend 무료 한도(100/일) 의 abuse 벡터 차단.
 */
const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_PER_HOUR = 10;

function buildRateLimitRules(key: string) {
  return [
    { key, windowMs: 60_000, max: RATE_LIMIT_PER_MINUTE },
    { key, windowMs: 60 * 60_000, max: RATE_LIMIT_PER_HOUR },
  ];
}

export async function POST(request: Request) {
  // ── 1. same-origin 검증 ────────────────────────────────────────────────
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  // ── 2. rate limit (fail-closed — round 5 fix) ─────────────────────────────
  // IP 추출 실패 시 전역 anonymous 버킷에 묶으면 정상 사용자 간 간섭이 발생한다
  // (한 명의 abuse 가 식별 안 된 모두를 429 로 만듦). 따라서 IP 식별 불가 자체를
  // 400 으로 즉시 거부 — 배포·프록시 설정 문제를 fail-closed 로 드러내는 쪽이 맞다.
  const ip = extractClientIp(request.headers);
  if (!ip) {
    return NextResponse.json(
      { error: "client_unidentified" },
      { status: 400 },
    );
  }
  const decision = checkRateLimits(buildRateLimitRules(ip));
  if (!decision.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": String(retryAfterSec) },
      },
    );
  }

  // ── 3. 본문 파싱·검증 ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BillingNotifySignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "schema_validation_failed",
        issues: parsed.error.issues,
      },
      { status: 422 },
    );
  }

  // 이메일은 로컬 변수로만 보관 — 함수 스코프 종료 시 GC.
  // 로깅·DB·KV·파일 어디에도 plain email 을 저장하지 않는다 (SPEC §05.7.5).
  const { email, source, ts } = parsed.data;
  const result = await delegateNotifySignupToResend(email);

  if (!result.ok) {
    if (process.env.NODE_ENV !== "production") {
      // 메타데이터만 — email 자체는 절대 로깅하지 않는다.
      console.warn("[billing/notify] resend delegation failed", {
        source,
        ts,
        reason: result.reason,
        status: result.status,
      });
    }
    if (result.reason === "unavailable") {
      return NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "external_error" }, { status: 502 });
  }

  // 성공 — 외부 위임 완료. 본 서버 상태 변경 0.
  // 중복(already_exists) 도 idempotent success — 응답 본문은 동일하게 { ok: true }.
  return NextResponse.json({ ok: true }, { status: 200 });
}

// 명시적으로 다른 메소드 거부.
export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
