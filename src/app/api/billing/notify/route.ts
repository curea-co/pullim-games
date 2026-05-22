// /api/billing/notify — V2 출시 알림 신청 (외부 메일 서비스 위임).
// SPEC §05.6 알림 신청 + §05.7.5 외부 메일 서비스 위임 정책.
//
// 정책 (2026-05-21 갱신 — Codex review round 2·3·5·6·9·10 fix):
// - 본 서버는 이메일을 저장하지 않는다. Resend 에 즉시 위임 후 변수 폐기.
// - Zod `.strict()` 적용 — 정의되지 않은 필드 동봉 시 422 (PII 누수 차단).
// - 응답 후 `email` 변수는 함수 스코프 종료와 함께 GC. DB·KV·파일·로그 어디에도 잔존 X.
// - **round 3 추가 가드** (Codex 지적 #2):
//   · same-origin 검증: `Origin`·`Referer` 헤더가 본 사이트 origin 일치해야 함. 외부 도메인 거부.
//   · rate limit: IP 별 sliding window. 인메모리 (인프라 의존 0).
// - **round 3 추가 분기** (Codex 지적 #1):
//   · Resend 4xx + "already"/"exists" 또는 409 → idempotent success (사용자에게 ok).
// - **round 5 fail-closed** (Codex 지적 #1):
//   · IP 추출 실패 시 `"anonymous"` 전역 버킷 fallback 제거. 식별 불가 → 즉시 400 거부.
//     (전역 anonymous 버킷은 정상 사용자 간 간섭을 유발 — fail-closed 가 옳다.)
// - **round 6 환경별 균형** (Codex 지적 #1):
//   · production 은 round 5 fail-closed 그대로 유지 (배포 설정 문제 노출).
//   · production 외(개발/테스트/로컬 프록시)에서는 `x-forwarded-for` 등 IP 헤더가
//     원래 없는 게 정상 — 이를 400 으로 막으면 `bun dev` localhost 폼이 깨진다.
//     production 이 아닐 때만 `dev:<host>` 폴백 키를 사용해 라우트가 작동하게 한다.
//     same-origin 가드가 이미 외부 남용 1차 차단을 하므로 dev 폴백은 안전.
// - **round 9 fix — NAT 친화 2-tier rate limit** (Codex 지적 #2):
//   · IP 30/분 + 100/시간 + (IP+email) 6/시간.
// - **round 9 fix — production 관측 신호** (Codex 지적 #3):
//   · Resend 위임 실패 시 환경 무관 `console.error` 구조화 로깅.
// - **round 10 fix #1 — CSRF 토큰 (Codex 지적 #1, 헤더 spoof 차단)**:
//   · Origin/Referer 헤더는 비브라우저 클라이언트가 쉽게 위조 가능 → 추가 가드 필요.
//   · 페이지 진입 시 GET `/api/billing/notify/csrf` 가 SameSite=Strict + HttpOnly 쿠키
//     발급 → POST 시 쿠키 자동 동봉 → 라우트가 nonce 검증.
//   · SameSite=Strict 는 브라우저가 cross-origin 요청에 쿠키 미동봉 — curl/봇 이
//     `Origin: https://<service>` 헤더만 spoof 해도 쿠키가 없으면 403.
//   · 1회 소비 + 1시간 만료 → replay 차단.
//   · same-origin 헤더 가드는 1차 방어로 유지 (CSRF 토큰이 2차 강 가드).
// - **round 10 fix #2 — Resend 일일 한도 정합 (Codex 지적 #2)**:
//   · 기존 IP 한도(30/분·100/시간) 만으로는 단일 IP 가 amortized 시 하루 2400 건 가능 →
//     Resend 무료 한도(100/일) 의 24배. 무료 quota 가 1시간 안에 전부 소진될 위험.
//   · IP 일일 한도 20/일 추가 + 글로벌 일일 cap 80/일 추가.
//   · 60/일 도달 시 console.warn 마커 (운영 측 soft warning).
//   · 일일 한도 도달 시 429 + Retry-After (다음 UTC 자정까지 ms).
//
// 응답 코드 정책:
//   200 — Resend 위임 성공 (신규 또는 중복=idempotent)
//   400 — invalid JSON 또는 (production 한정) IP 식별 불가
//   403 — same-origin 위반 또는 CSRF 토큰 부재·만료·위조
//   422 — schema 검증 실패 (추가 필드·잘못된 이메일 형식)
//   429 — rate limit 초과 (분·시간·일·글로벌 모두 동일 코드)
//   502 — Resend 외부 호출 실패 (4xx validation·auth, 5xx 등)
//   503 — Resend secret 미설정 (외부 의존성 단절)

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { BillingNotifySignupSchema } from "@/lib/core";
import { delegateNotifySignupToResend } from "@/lib/server/billing/resend-client";
import {
  readBillingNotifyCsrfToken,
  verifyBillingNotifyCsrfToken,
  type CsrfVerifyOutcome,
} from "@/lib/server/billing/csrf";
import { checkBillingNotifyDailyQuota } from "@/lib/server/billing/daily-quota";
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
 * Rate limit rule — 2-tier (round 9 fix: NAT 친화).
 *
 * tier 1 — **IP 한도**: 30/분 + 100/시간 (학교/학원/가정 NAT 친화 상향).
 *   기존 5/분·10/시간 한도는 공인 IP 1개를 공유하는 학생 N 명이 서로를 즉시 429 로
 *   막는 문제가 있었다. 30/분 = NAT 안에서 동시 5~10 명이 각자 재시도 2~3회 해도
 *   허용. 100/시간 = 한 시간 동안 같은 NAT 안 20+ 학생이 정상 신청 가능.
 *
 * tier 2 — **IP + email 해시 한도**: 6/시간 (좁은 abuse 차단).
 *   같은 IP 라도 같은 이메일로 6회 초과 신청 시 429. 같은 이메일 abuse 만 좁게 차단.
 *   email 해시는 normalize(lowercase + trim) 후 SHA-256(16 chars). 메모리 rate-limit
 *   bucket key 로만 사용 — DB·로그 저장 X (PII 0).
 *
 * tier 3 — **IP 일일 + 글로벌 일일 cap** (round 10 fix #2 — Resend 100/일 정합):
 *   별도 모듈(`daily-quota.ts`) 에서 관리. UTC 자정마다 reset.
 *   IP 20/일 + 글로벌 80/일. 60/일 도달 시 console.warn 마커.
 */
const RATE_LIMIT_IP_PER_MINUTE = 30;
const RATE_LIMIT_IP_PER_HOUR = 100;
const RATE_LIMIT_IP_EMAIL_PER_HOUR = 6;

/**
 * 이메일 → rate-limit bucket key 용 짧은 해시 (서버 측 SHA-256 prefix).
 *
 * 정책:
 *   - normalize: trim + lowercase (대소문자·공백 차이 우회 차단)
 *   - SHA-256 → hex prefix 16 chars (collision 충분히 낮음 + bucket key 짧게)
 *   - **저장 X**: rate-limit Map 의 일부로만 in-memory 잔존 → 시간 경과 시 GC.
 *   - DB·KV·로그 어디에도 저장하지 않음 — PII 0 정책 유지 (SPEC §5.7.5).
 */
function emailRateLimitToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function buildIpRateLimitRules(ipKey: string) {
  return [
    // tier 1 — IP 만 (NAT 친화 상향).
    { key: ipKey, windowMs: 60_000, max: RATE_LIMIT_IP_PER_MINUTE },
    { key: ipKey, windowMs: 60 * 60_000, max: RATE_LIMIT_IP_PER_HOUR },
  ];
}

function buildEmailRateLimitRule(ipKey: string, emailToken: string) {
  return {
    // tier 2 — IP + email 좁은 버킷 (같은 이메일 abuse 차단).
    key: `${ipKey}|email:${emailToken}`,
    windowMs: 60 * 60_000,
    max: RATE_LIMIT_IP_EMAIL_PER_HOUR,
  };
}

/**
 * rate-limit 식별자 해소 — round 6 fix.
 *
 * production: 실제 IP 가 헤더에 들어와야 한다(Vercel/CF/Nginx 가 보장). 없으면 빈 문자열
 * 반환 → 호출부가 400 으로 거부 (fail-closed, 배포 설정 문제 노출).
 *
 * production 외: `bun dev` localhost·일부 프록시 구성은 `x-forwarded-for` 등을 안 보낸다.
 * 이 경우 `dev:<host>` 폴백 키를 사용해 라우트가 작동하게 한다. same-origin 가드가 외부
 * 호출을 이미 차단하므로 dev 폴백은 안전. host 가 없으면 `dev:loopback` 으로 떨어진다.
 */
function resolveRateLimitKey(request: Request, rawIp: string): string {
  if (rawIp) return rawIp;
  if (process.env.NODE_ENV === "production") return "";

  const host =
    request.headers.get("host")?.trim() ||
    safeRequestHost(request) ||
    "loopback";
  return `dev:${host}`;
}

function safeRequestHost(request: Request): string {
  try {
    return new URL(request.url).host;
  } catch {
    return "";
  }
}

function rateLimitedResponse(retryAfterMs: number): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: { "retry-after": String(retryAfterSec) },
    },
  );
}

/**
 * CSRF 토큰 검증 outcome → HTTP 응답.
 * 모든 거부 사유를 403 으로 일반화 — 공격자 식별 정보 누설 차단.
 */
function csrfRejectionResponse(outcome: CsrfVerifyOutcome): NextResponse {
  return NextResponse.json(
    {
      error: "forbidden_csrf",
      // outcome 은 운영 디버깅 용도로만 노출 (production 로그 grep 도움). 공격자는 이미
      // missing/expired/invalid 중 어느 케이스인지 시도하면 알 수 있어 OPSEC 손실 X.
      reason: outcome,
    },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  // ── 1. same-origin 검증 (1차 가드) ─────────────────────────────────────
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  // ── 2. CSRF 토큰 검증 (2차 강 가드 — round 10 fix #1) ──────────────────
  // SameSite=Strict + HttpOnly 쿠키이므로 cross-origin 호출에 쿠키 미동봉.
  // 비브라우저 클라이언트(curl) 가 헤더만 spoof 해도 쿠키 nonce 가 없거나 위조 →
  // 즉시 403. CSRF 토큰 1회 소비 → replay 차단.
  const cookieHeader = request.headers.get("cookie");
  const csrfToken = readBillingNotifyCsrfToken(cookieHeader);
  const csrfOutcome = verifyBillingNotifyCsrfToken(csrfToken);
  if (csrfOutcome !== "valid") {
    return csrfRejectionResponse(csrfOutcome);
  }

  // ── 3. IP 식별 (fail-closed in prod · dev fallback — round 5·6 fix) ────
  // production: IP 추출 실패 시 전역 anonymous 버킷에 묶으면 정상 사용자 간 간섭이
  // 발생한다(한 명의 abuse 가 식별 안 된 모두를 429 로 만듦). 따라서 IP 식별 불가
  // 자체를 400 으로 즉시 거부 — 배포·프록시 설정 문제를 fail-closed 로 드러낸다.
  //
  // production 외(개발/테스트/로컬 프록시): IP 헤더는 원래 없는 게 정상이므로
  // `dev:<host>` 폴백 키를 써서 라우트를 작동시킨다. same-origin + CSRF 가드가 외부
  // 호출을 1차 차단하기 때문에 dev 폴백은 안전.
  const rawIp = extractClientIp(request.headers);
  const rateLimitKey = resolveRateLimitKey(request, rawIp);
  if (!rateLimitKey) {
    return NextResponse.json(
      { error: "client_unidentified" },
      { status: 400 },
    );
  }

  // ── 4. tier 1 rate limit — IP 만 (사전 abuse 차단) ─────────────────────
  // 본문 파싱 전에 IP 한도부터 적용해 invalid-body 폭주 abuse 도 막는다.
  // tier 2 (IP+email) 은 schema 파싱 후 적용 (email 필요).
  const ipDecision = checkRateLimits(buildIpRateLimitRules(rateLimitKey));
  if (!ipDecision.allowed) {
    return rateLimitedResponse(ipDecision.retryAfterMs);
  }

  // ── 5. tier 3 일일 한도 — IP 일일·글로벌 일일 (round 10 fix #2) ────────
  // Resend 무료 한도(100/일) 정합. IP 20/일 + 글로벌 80/일.
  // 본문 파싱 전 적용 — 일일 한도 도달 시 schema 검증 비용도 절약.
  const dailyDecision = checkBillingNotifyDailyQuota({ ipKey: rateLimitKey });
  if (!dailyDecision.allowed) {
    return rateLimitedResponse(dailyDecision.retryAfterMs);
  }

  // ── 6. 본문 파싱·검증 ──────────────────────────────────────────────────
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

  // ── 7. tier 2 rate limit — IP + email 좁은 버킷 (round 9 fix #2) ───────
  // tier 1 (IP 만) 은 NAT 친화로 30/분·100/시간 으로 넓혀졌으므로, 같은-이메일 abuse
  // 만 좁게 6/시간 으로 막는 보완 버킷이다. emailToken 은 SHA-256 prefix (메모리만).
  const emailToken = emailRateLimitToken(email);
  const emailDecision = checkRateLimits([
    buildEmailRateLimitRule(rateLimitKey, emailToken),
  ]);
  if (!emailDecision.allowed) {
    return rateLimitedResponse(emailDecision.retryAfterMs);
  }

  const result = await delegateNotifySignupToResend(email);

  if (!result.ok) {
    // round 9 fix #3 — production 에서도 구조화 로깅 (Vercel logs 에서 관측 가능).
    // email 원문은 절대 포함하지 않음. secret 미설정·외부 장애를 운영 측이 즉시 인지.
    console.error("[billing/notify] resend delegation failed", {
      source,
      ts,
      reason: result.reason,
      status: result.status,
      // marker — secret 미설정(503) vs 외부 호출 실패(502) 를 grep 으로 구분.
      marker: result.reason === "unavailable" ? "secret_missing" : "external_error",
    });
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
