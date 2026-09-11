// 입구 게이트 — 서버(Edge) 레벨 1차 판정 (Codex #114 R4).
// plan: proc/plan/2026-06-01_arcade-entry-model.md. spec/05 §5.2.
//
// 게스트 신원은 localStorage 라 서버가 직접 읽을 수 없으므로, 게스트 생성 시 함께 심는
// non-HttpOnly 힌트 쿠키(`pullim_games_guest`)와 회원 세션 쿠키(`pullim_games_session`)의
// **존재 여부**만 본다. 둘 다 없으면 = 완전 무신원 → 서버에서 `/`(랜딩)로 리다이렉트.
// (직접 요청·JS 비활성에서도 보호 라우트가 200으로 노출되지 않게 한다.)
//
// 쿠키 "존재"만 보는 coarse gate — 만료/위조 세션의 정밀 판정은 클라 RequireIdentity 가 담당
// (방어 심층화). 미들웨어는 DB·네트워크 미접근(엣지)이라 값싸고 빠르다.
//
// 🔴 게이트 2단 계약(spec/05 §5.2, plan R9): 미들웨어는 coarse(쿠키 presence)만, 네트워크
//    호출 금지. pullim 모드에서도 introspection(`/games/me`)을 여기서 때리지 않는다 — 5xx 를
//    fail-closed 로 처리하면 pullim-api 일시 장애만으로 로그인 회원이 튕겨 fail-open 계약이
//    깨진다. 정밀 introspection + fail-open 은 클라 RequireIdentity(useIdentity).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";

const SESSION_COOKIE = "pullim_games_session"; // legacy 모드 회원 세션(host-only)
const GUEST_COOKIE = "pullim_games_guest"; // 게스트 힌트(양 모드 공통, 무변경)
// pullim 모드 회원 세션 = pullim-api 발급 `*-pullim-at` 쿠키(Domain=.pullim.ai, HttpOnly).
// HttpOnly 라도 서버(엣지)는 request 쿠키로 읽을 수 있다. suffix 매칭으로 env 접두
// (`local-`/`__Secure-dev-`/`__Secure-prod-`) 전부 커버.
const PULLIM_AT_SUFFIX = "-pullim-at";

function hasMemberCookie(req: NextRequest): boolean {
  if (PULLIM_MODE) {
    return req.cookies
      .getAll()
      .some((c) => c.name.endsWith(PULLIM_AT_SUFFIX) && Boolean(c.value));
  }
  return Boolean(req.cookies.get(SESSION_COOKIE)?.value);
}

export function middleware(req: NextRequest) {
  const hasMember = hasMemberCookie(req);
  const hasGuest = Boolean(req.cookies.get(GUEST_COOKIE)?.value);
  // 게스트 OR 회원 둘 중 하나라도 있으면 통과(OR — 게스트 우선 보존, spec/05 §5.2).
  if (!hasMember && !hasGuest) {
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
