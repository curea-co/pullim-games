// GET /api/auth/me — 현재 로그인 사용자 (없으면 user: null).
import { NextResponse } from "next/server";
import {
  getUserFromSessionToken,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";
import { toPublicUser } from "@/lib/server/auth/users";

export async function GET(request: Request) {
  const token = readSessionTokenFromCookie(request.headers.get("cookie"));
  const user = await getUserFromSessionToken(token);
  return NextResponse.json({ user: user ? toPublicUser(user) : null }, { status: 200 });
}
