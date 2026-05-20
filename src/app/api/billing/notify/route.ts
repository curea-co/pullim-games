// /api/billing/notify — V2 출시 알림 신청 (외부 메일 서비스 위임).
// SPEC §05.6 알림 신청 + §05.7.5 외부 메일 서비스 위임 정책.
//
// 정책 (2026-05-20 갱신 — Codex review fix):
// - 본 서버는 이메일을 저장하지 않는다. Resend 에 즉시 위임 후 변수 폐기.
// - Zod `.strict()` 적용 — 정의되지 않은 필드 동봉 시 422 (PII 누수 차단).
// - 응답 후 `email` 변수는 함수 스코프 종료와 함께 GC. DB·KV·파일·로그 어디에도 잔존 X.
//
// 응답 코드 정책:
//   200 — Resend 위임 성공
//   400 — invalid JSON
//   422 — schema 검증 실패 (추가 필드·잘못된 이메일 형식)
//   502 — Resend 외부 호출 실패
//   503 — Resend secret 미설정 (외부 의존성 단절)

import { NextResponse } from "next/server";
import { BillingNotifySignupSchema } from "@/lib/core";
import { delegateNotifySignupToResend } from "@/lib/server/billing/resend-client";

export async function POST(request: Request) {
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
  return NextResponse.json({ ok: true }, { status: 200 });
}

// 명시적으로 다른 메소드 거부.
export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
