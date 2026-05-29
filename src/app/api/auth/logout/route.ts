// POST /api/auth/logout — 세션 파기 + 쿠키 제거.
import { NextResponse } from "next/server";
import {
  buildClearSessionCookie,
  destroySession,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { AUTH_CSRF_HEADER, authCsrf } from "@/lib/server/auth/csrf";

export async function POST(request: Request) {
  // signup/login 과 동일한 2층 방어 — same-origin + double-submit CSRF.
  // logout 도 강제 로그아웃(CSRF) 표면이라 방어 수준을 맞춘다.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  if (
    !authCsrf.verify(
      authCsrf.readCookieToken(request.headers.get("cookie")),
      request.headers.get(AUTH_CSRF_HEADER),
    )
  ) {
    return NextResponse.json({ error: "forbidden_csrf" }, { status: 403 });
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
