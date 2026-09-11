// pullim 모드 로그인·가입 리다이렉트 헬퍼 — 미인증 회원을 pullim-web `/login`·`/signup`으로
// cross-서브도메인 위임한다(회원 경로 = pullim-web 중앙 위임, spec/05 §5.2).
// plan: proc/plan/2026-07-03_games-unified-login-os-delegation.md PR-1.
//
// ⚠️ origin = SITE 호스트(NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN, dev `dev.pullim.ai`/prod `pullim.ai`),
//    OS 호스트(`*-os`) 아님. 로그인·가입 성공 후 검증된 next 로 games 복귀(pullim-web resolveNext).
// cross-origin 이라 next router 불가 → 호출부는 window.location.assign(...) 사용.
"use client";

import { PULLIM_LOGIN_ORIGIN } from "./pullim-mode";
import { getSiteUrl } from "@/lib/site-url";

/**
 * games 홈 절대 URL(AuthCta no-JS 폴백 href 의 기본 next). **클라 런타임 = 현재 origin(window)**
 * 이라 실제 호스트 정확. **SSR(초기 HTML href) = `getSiteUrl()`** (NEXT_PUBLIC_SITE_URL 우선 →
 * prod/dev/preview VERCEL_URL). ⚠️ AuthCta 는 client 컴포넌트라 SSR 에서 `headers()`(실제 요청
 * 호스트)를 못 쓴다 — 그래서 **로컬 SSO(`games.pullim.local:3004`)는 NEXT_PUBLIC_SITE_URL 설정 필요**
 * (그래야 no-JS href 의 next 가 실제 호스트로; JS on 이면 window 로 자동 정확). 서버 direct-hit
 * (`/login`·`/signup` page)는 `getRequestOrigin`(headers) 로 이미 실제 호스트 보존(Codex #141).
 * sibling `gamesUrl()`(env 추정) 은 쓰지 않는다.
 */
function gamesHomeUrl(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/home`;
  return `${getSiteUrl()}/home`;
}

function buildAuthUrl(path: "/login" | "/signup", nextFullUrl: string): string {
  return `${PULLIM_LOGIN_ORIGIN}${path}?next=${encodeURIComponent(nextFullUrl)}`;
}

/** pullim-web 로그인 URL. nextFullUrl = 로그인 후 복귀할 games 절대 URL. */
export function pullimLoginUrl(nextFullUrl: string): string {
  return buildAuthUrl("/login", nextFullUrl);
}

/** pullim-web 회원가입 URL(로그인과 대칭). nextFullUrl = 가입 후 복귀할 games 절대 URL. */
export function pullimSignupUrl(nextFullUrl: string): string {
  return buildAuthUrl("/signup", nextFullUrl);
}

/** 현재 페이지 절대 URL(cross-origin 복귀 next 로 쓴다). 서버에선 "". */
export function currentAbsoluteUrl(): string {
  return typeof window !== "undefined" ? window.location.href : "";
}

/** pullim 모드에서 로그인/가입 진입을 pullim-web 으로 하드 내비게이션. cross-origin(next router 불가). */
export function gotoPullimAuth(kind: "login" | "signup"): void {
  if (typeof window === "undefined") return;
  const next = currentAbsoluteUrl();
  window.location.assign(kind === "login" ? pullimLoginUrl(next) : pullimSignupUrl(next));
}

/**
 * SSR/no-JS 폴백 href — pullim-web 인증 URL + **기본 next=games 홈**(Codex #141).
 * 클릭(JS)은 gotoPullimAuth 가 현재 URL 을 next 로 덮어 정밀 복귀. JS 비활성·새 탭·링크 복사처럼
 * href 자체를 소비하는 경로에선 이 기본 next(games 홈)로 인증 후 games 복귀(§5.2 `/login?next=` 계약).
 */
export function pullimAuthHref(kind: "login" | "signup"): string {
  const path = kind === "login" ? "/login" : "/signup";
  return `${PULLIM_LOGIN_ORIGIN}${path}?next=${encodeURIComponent(gamesHomeUrl())}`;
}
