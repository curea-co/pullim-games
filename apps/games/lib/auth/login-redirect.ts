// pullim 모드 로그인·가입 리다이렉트 헬퍼 — 미인증 회원을 pullim-web `/login`·`/signup`으로
// cross-서브도메인 위임한다(회원 경로 = pullim-web 중앙 위임, spec/05 §5.2).
// plan: proc/plan/2026-07-03_games-unified-login-os-delegation.md PR-1.
//
// ⚠️ origin = SITE 호스트(NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN, dev `dev.pullim.ai`/prod `pullim.ai`),
//    OS 호스트(`*-os`) 아님. 로그인·가입 성공 후 검증된 next 로 games 복귀(pullim-web resolveNext).
// cross-origin 이라 next router 불가 → 호출부는 window.location.assign(...) 사용.
"use client";

import { PULLIM_LOGIN_ORIGIN } from "./pullim-mode";

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
 * SSR/no-JS 폴백 href — next 없는 pullim-web 인증 URL(`{origin}/login|/signup`).
 * 클릭 시엔 gotoPullimAuth 가 현재 URL 을 next 로 붙여 정밀 복귀. JS 비활성 시엔 이 href 로
 * pullim-web 인증 페이지까지는 도달(next 없이 → 인증 후 games 홈 복귀). 로컬 dormant 라우트로 안 샘.
 */
export function pullimAuthHref(kind: "login" | "signup"): string {
  return `${PULLIM_LOGIN_ORIGIN}${kind === "login" ? "/login" : "/signup"}`;
}
