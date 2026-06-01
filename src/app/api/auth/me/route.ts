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
    console.error("[auth/me] backend 미가용", (err as Error).message);
    // 입구 모델(Codex #114 R2): "세션 없음(user:null)"과 "auth 백엔드 장애(미확정)"를 구분해
    // 503 으로 응답한다. 그래야 세션 쿠키가 살아있는 회원이 DB 일시 장애만으로 게이트에서
    // `/`로 튕기지 않고, 클라가 fail-open 판단할 수 있다. (익명 브라우징은 게이트가 처리.)
    return NextResponse.json(
      { user: null, unavailable: true },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
  // 사용자 식별 JSON(이메일 등)이 중간 캐시·다른 경로로 재사용되지 않게 서버 응답을
  // 비공개·비캐시로 못 박는다(클라 cache:no-store 만으로는 불충분).
  return NextResponse.json(
    { user: user ? toPublicUser(user) : null },
    { status: 200, headers: { "cache-control": "private, no-store" } },
  );
}
