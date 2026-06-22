// GET /api/sync/csrf — 동기화 POST 전 CSRF 토큰 쿠키 발급(double-submit).
// 엔진은 매 flush 전 쿠키 값을 읽어 x-csrf-token 헤더로 echo. 근거: plan §5 P3/P4.
import { NextResponse } from "next/server";
import { syncCsrf } from "@/lib/server/learning/sync-csrf";

export const dynamic = "force-dynamic";

export function GET() {
  const { cookieHeader } = syncCsrf.issue();
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "set-cookie": cookieHeader, "cache-control": "no-store" } },
  );
}
