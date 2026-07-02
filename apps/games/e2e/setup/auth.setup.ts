// e2e 전역 인증 셋업 — Playwright storageState 파일 생성.
// plan: proc/plan/2026-06-30_e2e-infra-fix.md §2 H2 fix.
//
// 목적:
//   모든 e2e spec 이 인증/온보딩 게이트를 통과한 상태에서 시작할 수 있도록
//   Playwright storageState 를 미리 만든다. playwright.config.ts 의 `use.storageState` 로
//   각 테스트 컨텍스트가 이 상태를 상속받는다.
//
// 게이트 구조 (middleware.ts + RequireIdentity.tsx):
//   - 서버: pullim_games_guest 쿠키 존재 → "/" 리다이렉트 없음 (coarse gate, 값 미검증).
//   - 클라: localStorage "pullim-games:player" 파싱 → grade 가 GRADES 안에 있으면 유효 guest profile.
//
// 주의: 일부 spec 은 내부에서 localStorage.clear() 를 호출하는데, 이는 player profile 도 함께
//   지운다 → 게이트 실패. 그런 spec 은 helpers/auth.ts 의 seedGuestSession() 을 명시적으로
//   호출해 재주입해야 한다 (activity-heatmap.spec.ts, home-dashboard-layout.spec.ts 등).
//   storageState 는 테스트 시작 시점의 초기 상태를 제공하지, 런타임 localStorage.clear() 이후를
//   복구하지는 않는다.

import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

// auth.setup.ts 위치: apps/games/e2e/setup/ → ../../ = apps/games/.
// playwright.config.ts 의 STORAGE_STATE_PATH 와 일치해야 함.
const STORAGE_STATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  ".playwright",
  "guest-auth.json",
);

// 게스트 플레이어 프로필 (lib/core/player/index.ts Player 타입, GRADES 중 하나여야 함)
const E2E_PLAYER = {
  nickname: "E2E테스터",
  grade: "중1",
  consent: true,
  createdAt: 1748736000000, // 2025-06-01T00:00:00.000Z 고정 — 재현성
};

const PLAYER_KEY = "pullim-games:player";
const GUEST_COOKIE_NAME = "pullim_games_guest";

setup("게스트 인증 storageState 생성", async ({ page, context }) => {
  // 1. 게스트 쿠키 주입 — 미들웨어 서버 게이트(Edge) 통과용.
  await context.addCookies([
    {
      name: GUEST_COOKIE_NAME,
      value: "1",
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60, // 180일
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // 2. localStorage 게스트 프로필 주입 — RequireIdentity 클라이언트 게이트 통과용.
  //    빈 페이지로 이동해 localStorage 에 접근할 수 있게 한다.
  await page.goto("/");
  await page.evaluate(
    ({ key, player }) => {
      window.localStorage.setItem(key, JSON.stringify(player));
    },
    { key: PLAYER_KEY, player: E2E_PLAYER },
  );

  // 3. storageState 저장 — 이후 모든 테스트 컨텍스트가 이 상태를 상속.
  //    fresh checkout 엔 .playwright/ 가 없으므로 부모 디렉터리를 먼저 생성한다(Codex #134 R1).
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
