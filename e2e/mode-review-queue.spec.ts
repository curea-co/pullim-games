// Plan E Phase 2 — review-queue URL 진입 통합 검증.
// 진입 시 정상 로드 + GameShell 가시. 카드 수 차이는 selectCardsForMode 단위 테스트가 검증.

import { test, expect } from "@playwright/test";

const SAMPLE_GAMES = [
  "math-quick-quiz",
  "english-blank",
  "factorization",
  "chemistry-balance",
];

for (const gameId of SAMPLE_GAMES) {
  test(`${gameId} — ?mode=review-queue 진입 정상 로드`, async ({ page }) => {
    const res = await page.goto(`/games/${gameId}?mode=review-queue`);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    const shell = page.getByTestId("game-shell");
    await expect(shell).toBeVisible();
  });

  test(`${gameId} — default 진입 (mode 미명시) 정상 로드`, async ({ page }) => {
    const res = await page.goto(`/games/${gameId}`);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    const shell = page.getByTestId("game-shell");
    await expect(shell).toBeVisible();
  });
}

test("잘못된 mode 값 — default로 fallback (?mode=garbage)", async ({ page }) => {
  const res = await page.goto(`/games/math-quick-quiz?mode=garbage`);
  expect(res?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  const shell = page.getByTestId("game-shell");
  await expect(shell).toBeVisible();
});
