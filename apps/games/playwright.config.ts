// Playwright e2e config — `proc/plan/2026-05-11_qa-playwright-setup.md` §4.2 따름.
//
// 핵심 결정:
// - Chromium 단일 (WebKit/Firefox 는 V2 — 실 사용자 기반 차이 미미, CI 시간 절약)
// - production build → next start (dev HMR/warning 회피, 진짜 사용자 환경)
// - retries 2 (CI 만, 로컬은 0) — flaky 마스킹용, 빈도 모니터링 필요
//
// 2026-07-02 H2 fix (plan: proc/plan/2026-06-30_e2e-infra-fix.md):
// - "setup" 프로젝트: e2e/setup/auth.setup.ts → .playwright/guest-auth.json storageState 생성.
//   쿠키(pullim_games_guest) + localStorage(pullim-games:player) 로 게이트 통과 상태 준비.
// - "chromium" 프로젝트: setup 완료 후 실행, storageState 상속 → 모든 spec 이 인증 상태로 시작.
// - 주의: 일부 spec 이 내부에서 localStorage.clear() 를 호출하면 player profile 이 지워져 게이트
//   실패 → 그런 spec 은 helpers/auth.ts seedGuestSession() 으로 재주입 필요.

import { defineConfig, devices } from "@playwright/test";
import path from "path";

const PORT = 3004;
const baseURL = `http://localhost:${PORT}`;

// Playwright storageState 파일 경로 — e2e/setup/auth.setup.ts 와 동일.
// import 로 auth.setup 을 끌어오면 setup 내 test() 호출이 config 로딩 시 실행돼 에러 발생하므로
// 경로 상수를 여기서 직접 정의한다.
// playwright.config.ts 위치: apps/games/ → __dirname = apps/games/.
export const STORAGE_STATE_PATH = path.join(
  __dirname,
  ".playwright",
  "guest-auth.json",
);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // storageState 는 전역에 두지 않는다 — "setup" 프로젝트가 이 파일을 **생성**하는 쪽이라
    // 전역으로 걸면 setup 컨텍스트가 아직 없는 파일을 읽으려다 ENOENT 로 죽는다(Codex #134 R1:
    // `storageState: undefined` 프로젝트 오버라이드가 전역을 못 덮는 Playwright 판정 회피).
    // storageState 상속은 아래 "chromium" 프로젝트 use 에만 명시한다.
  },
  projects: [
    // 1단계: 게스트 인증 storageState 생성 (모든 spec 실행 전 1회). storageState 미상속(생성 전담).
    {
      name: "setup",
      testMatch: /setup\/auth\.setup\.ts/,
    },
    // 2단계: 모든 spec — setup 완료 후 storageState 상속. setup 파일은 testIgnore 로 명시 격리
    // (chromium 이 setup 을 재실행해 guest-auth.json 을 병렬 덮어쓰는 레이스 차단 — Codex #134 R2).
    {
      name: "chromium",
      testIgnore: /setup\//,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE_PATH },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "bun run build && bun run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
