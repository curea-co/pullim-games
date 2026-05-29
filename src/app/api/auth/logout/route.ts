// POST /api/auth/logout — 세션 파기 + 쿠키 제거.
import { NextResponse } from "next/server";
import {
  buildClearSessionCookie,
  destroySession,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";

export async function POST(request: Request) {
  // same-origin 가드 — 외부 폼이 강제 로그아웃 시키는 것을 차단(저위험이라 CSRF 토큰은 생략).
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  const token = readSessionTokenFromCookie(request.headers.get("cookie"));
  if (token) {
    await destroySession(token);
  }
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "set-cookie": buildClearSessionCookie() } },
  );
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
