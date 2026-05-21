// /api/event — 익명 이벤트 로깅 엔드포인트.
// SPEC §05.3 + §10.3 Phase 2 데이터 로깅.
// V0.1: zod 검증 + 콘솔 로그. V0.2: Vercel Analytics + 분석 DB 통합.

import { NextResponse } from "next/server";
import { EventSchema } from "@/lib/core";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "schema_validation_failed",
        issues: parsed.error.issues,
      },
      { status: 422 },
    );
  }

  const event = parsed.data;

  // V0.1: 콘솔 로그. 분석 백엔드 통합은 V0.2.
  if (process.env.NODE_ENV !== "production") {
    console.log("[event]", {
      gameId: event.gameId,
      action: event.action,
      cardId: event.cardId,
      timestampMs: event.timestampMs,
    });
  }

  // PII 0 — fingerprint 외에는 식별 정보 없음 (SPEC §05.6)
  return NextResponse.json({ ok: true }, { status: 200 });
}

// 명시적으로 다른 메소드 거부
export async function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405 },
  );
}
