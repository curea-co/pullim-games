// GET /api/auth/csrf — auth 폼 진입 시 CSRF 토큰 쿠키 발급.
// 클라이언트는 signup/login POST 전에 이 GET 을 호출해 쿠키를 받고, POST 시 쿠키가
// 자동 동봉(SameSite=Strict)되어 라우트가 nonce 검증. 근거: Codex review(CSRF 부재).
import { NextResponse } from "next/server";
import { authCsrf } from "@/lib/server/auth/csrf";

export function GET() {
  const { cookieHeader } = authCsrf.issue();
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "set-cookie": cookieHeader } },
  );
}
