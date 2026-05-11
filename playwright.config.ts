// Playwright e2e config — `proc/plan/2026-05-11_qa-playwright-setup.md` §4.2 따름.
//
// 핵심 결정:
// - Chromium 단일 (WebKit/Firefox 는 V2 — 실 사용자 기반 차이 미미, CI 시간 절약)
// - production build → next start (dev HMR/warning 회피, 진짜 사용자 환경)
// - retries 2 (CI 만, 로컬은 0) — flaky 마스킹용, 빈도 모니터링 필요

import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

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
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
