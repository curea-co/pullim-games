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
  // 사용자 식별 JSON(이메일 등)이 중간 캐시·다른 경로로 재사용되지 않게 서버 응답을
  // 비공개·비캐시로 못 박는다(클라 cache:no-store 만으로는 불충분).
  return NextResponse.json(
    { user: user ? toPublicUser(user) : null },
    { status: 200, headers: { "cache-control": "private, no-store" } },
  );
}
