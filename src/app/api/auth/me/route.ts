// GET /api/auth/me — 현재 로그인 사용자 (없으면 user: null).
import { NextResponse } from "next/server";
import {
  getUserFromSessionToken,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";
import { toPublicUser } from "@/lib/server/auth/users";

export async function GET(request: Request) {
  const token = readSessionTokenFromCookie(request.headers.get("cookie"));
  // fail-soft: 계정은 선택 기능이고 비로그인 플레이가 기본이므로, auth 백엔드(DB) 장애
  // (DATABASE_URL 미설정·마이그레이션 실패·Supabase 일시 장애)에도 익명 브라우징을
  // 막지 않는다 — 500 대신 { user: null } 로 응답(헤더만 비로그인 상태로 표시).
  let user = null;
  try {
    user = await getUserFromSessionToken(token);
  } catch (err) {
    console.error("[auth/me] backend 미가용 — user:null 로 fail-soft", (err as Error).message);
  }
  // 사용자 식별 JSON(이메일 등)이 중간 캐시·다른 경로로 재사용되지 않게 서버 응답을
  // 비공개·비캐시로 못 박는다(클라 cache:no-store 만으로는 불충분).
  return NextResponse.json(
    { user: user ? toPublicUser(user) : null },
    { status: 200, headers: { "cache-control": "private, no-store" } },
  );
}
