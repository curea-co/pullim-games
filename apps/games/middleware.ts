// 입구 게이트 — 서버(Edge) 레벨 1차 판정 (Codex #114 R4).
// plan: proc/plan/2026-06-01_arcade-entry-model.md. spec/05 §5.2.
//
// 게스트 신원은 localStorage 라 서버가 직접 읽을 수 없으므로, 게스트 생성 시 함께 심는
// non-HttpOnly 힌트 쿠키(`pullim_games_guest`)와 회원 세션 쿠키(`pullim_games_session`)의
// **존재 여부**만 본다. 둘 다 없으면 = 완전 무신원 → 서버에서 `/`(랜딩)로 리다이렉트.
// (직접 요청·JS 비활성에서도 보호 라우트가 200으로 노출되지 않게 한다.)
//
// 쿠키 "존재"만 보는 coarse gate — 만료/위조 세션의 정밀 판정은 클라 RequireIdentity +
// `/api/auth/me` 가 담당(방어 심층화). 미들웨어는 DB 미접근(엣지)이라 값싸고 빠르다.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "pullim_games_session";
const GUEST_COOKIE = "pullim_games_guest";

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const hasGuest = Boolean(req.cookies.get(GUEST_COOKIE)?.value);
  if (!hasSession && !hasGuest) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// 보호 대상: 대시보드(/home) + 게임 플레이(/games/<id>...). 게임 허브(/games)·랜딩·인증은 열림.
export const config = {
  matcher: ["/home", "/games/:gameId+"],
};
