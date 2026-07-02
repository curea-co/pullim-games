// e2e 게스트 신원 seed — middleware(쿠키) + RequireIdentity(localStorage) 게이트 동시 통과용.
// plan: proc/plan/2026-06-30_e2e-infra-fix.md §2 H2 fix.
//
// 게이트 구조 (2026-06-01 arcade 입구 모델 #114 + 2026-06-23 학년 수집 #125):
//
//   1. middleware.ts (Edge, 서버):
//      pullim_games_session(HttpOnly) 또는 pullim_games_guest(non-HttpOnly) 쿠키 없으면 → "/" 리다이렉트.
//      쿠키 값 검증 없음 — "존재" 여부만 본다(coarse gate).
//
//   2. RequireIdentity (클라이언트):
//      getPlayer() → localStorage "pullim-games:player" 파싱.
//      Player.grade 가 GRADES("중1"~"고3") 안에 없으면 clearPlayer() + null 반환 → "/" 리다이렉트.
//
//   → e2e 에서 두 조건을 모두 충족해야 게임/대시보드 콘텐츠가 렌더된다.
//
// 쿠키 시딩 방식:
//   pullim_games_guest 는 non-HttpOnly(lib/core/player/index.ts: document.cookie 로 쓰임) →
//   Playwright context.addCookies 로 직접 주입 가능.
//   pullim_games_session 은 HttpOnly → Playwright 가 JS 로 읽을 수 없으나, 쿠키 자체는
//   addCookies API 로 삽입 가능. 단, 실제 DB 세션이 없으면 /api/auth/me 가 null 반환 →
//   getAuthState() null — 회원 판정은 안 되지만 getPlayer() 가 guest profile 을 반환하면
//   hasIdentity=true 이므로 게스트 경로로 충분하다.
//
// localStorage 시딩:
//   addInitScript 로 페이지 초기화 스크립트 등록 — goto 전에 등록해야 첫 렌더 전에 반영됨.
//   addCookies 는 goto 전·후 모두 반영되나 addInitScript 는 반드시 goto 전에 호출해야 함.
//
// 사용법:
//   import { seedGuestSession } from "./helpers/auth";
//
//   test.beforeEach(async ({ page, context }) => {
//     await seedGuestSession(page, context);
//   });
//
//   // 또는 특정 spec 내:
//   await seedGuestSession(page, context);
//   await page.goto("/home");

import type { Page, BrowserContext } from "@playwright/test";

/** e2e 게스트 플레이어 프로필 — GRADES 목록(lib/core/player/index.ts) 중 하나여야 함. */
const E2E_PLAYER = {
  nickname: "E2E테스터",
  grade: "중1",
  consent: true,
  createdAt: 1748736000000, // 2025-06-01T00:00:00.000Z (고정 과거 시각, 재현성)
};

const PLAYER_KEY = "pullim-games:player";
const GUEST_COOKIE_NAME = "pullim_games_guest";

/**
 * e2e 게스트 세션 seed — middleware(쿠키) + RequireIdentity(localStorage) 두 게이트 동시 통과.
 *
 * @param page    Playwright Page — addInitScript 로 localStorage 주입.
 * @param context Playwright BrowserContext — addCookies 로 게스트 쿠키 주입.
 *
 * 주의: addInitScript 는 반드시 **page.goto() 호출 전**에 등록해야 첫 렌더 전에 script 가 실행된다.
 *       addCookies 는 goto 전·후 모두 유효하나, 미들웨어 판정이 첫 요청 시에 일어나므로 goto 전 권장.
 */
export async function seedGuestSession(
  page: Page,
  context: BrowserContext,
): Promise<void> {
  // 1. 게스트 쿠키 주입 — 미들웨어 서버 게이트 통과.
  //    domain: "localhost", path: "/" — 로컬 Playwright 서버 기준.
  //    expires: 현재 + 180일(GUEST_TTL_DAYS — lib/core/player/index.ts 와 동일).
  await context.addCookies([
    {
      name: GUEST_COOKIE_NAME,
      value: "1",
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // 2. localStorage 게스트 프로필 주입 — RequireIdentity 클라이언트 게이트 통과.
  //    addInitScript 는 goto 전에 등록해야 첫 렌더 전에 실행된다.
  await page.addInitScript(
    ({ key, player }) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(player));
      } catch {
        // localStorage 거부 환경은 e2e 대상 아님
      }
    },
    { key: PLAYER_KEY, player: E2E_PLAYER },
  );
}
