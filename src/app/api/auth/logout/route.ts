// POST /api/auth/logout — 세션 파기 + 쿠키 제거.
import { NextResponse } from "next/server";
import {
  buildClearSessionCookie,
  destroySession,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";

export async function POST(request: Request) {
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
