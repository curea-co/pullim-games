// /api/billing/notify — V2 출시 알림 신청 (이메일 hash 등록).
// SPEC §05.6 알림 신청 + §05.7 결제·구독 정책.
//
// 정책:
// - 이메일 원문은 절대 수신하지 않는다. 클라이언트가 sha256 hash 만 전송.
// - 6개월 보존 정책 (분석 백엔드 통합 시 retention rule 적용).
// - PII 0 — fingerprint 도 받지 않는다 (alert subscribers 와 게임 fingerprint 는 분리).
//
// 현 구현은 V0.1 — 콘솔 로그만 (storage 미통합).
// V0.2 통합 시: Vercel KV (또는 분석 DB) `billing_notify_signups` 테이블에
//   `{ emailHash, ts, expiresAt = ts + 180d }` 형태로 적재.

import { NextResponse } from "next/server";
import { BillingNotifySignupSchema } from "@/lib/core";

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

  const signup = parsed.data;

  // V0.1: 콘솔 로그. 분석 백엔드 통합 시 6개월 retention 적용.
  if (process.env.NODE_ENV !== "production") {
    console.log("[billing/notify]", {
      action: signup.action,
      emailHashPreview: signup.emailHash.slice(0, 8) + "…",
      ts: signup.ts,
    });
  }

  // PII 0 — emailHash 외에는 식별 정보 없음 (SPEC §05.6).
  return NextResponse.json({ ok: true }, { status: 200 });
}

// 명시적으로 다른 메소드 거부.
export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
