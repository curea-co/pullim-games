// Plan E Phase 3 — time-attack URL 진입 + 타이머 노출 검증.
// 30초 timeout 까지 실시간 카운트다운은 비현실적 e2e — timer DOM 노출 + URL 진입 정상 로드만 검증.

import { test, expect } from "@playwright/test";

const SAMPLE_GAMES = [
  "math-quick-quiz",
  "english-blank",
  "english-vocab-typing",
  "english-word-match",
];

for (const gameId of SAMPLE_GAMES) {
  test(`${gameId} — ?mode=time-attack 진입 + timer 노출`, async ({ page }) => {
    const res = await page.goto(`/games/${gameId}?mode=time-attack`);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    const shell = page.getByTestId("game-shell");
    await expect(shell).toBeVisible();
    // 4 메커니즘 컴포넌트만 타이머 표시 — 12 직접 게임은 본 PR 스코프 아님.
    const timer = page.getByTestId("time-attack-timer");
    await expect(timer).toBeVisible({ timeout: 5_000 });
    // 초 카운트가 합리적인 범위 (0~30)
    const secondsText = await page
      .getByTestId("time-attack-seconds")
      .textContent();
    const match = secondsText?.match(/(\d+)s/);
    expect(match).not.toBeNull();
    const seconds = parseInt(match![1]!, 10);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(30);
  });
}

test("time-attack default 모드 fallback (?mode=time-attack 미명시 시 timer 미노출)", async ({
  page,
}) => {
  const res = await page.goto(`/games/math-quick-quiz`);
  expect(res?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  const timer = page.getByTestId("time-attack-timer");
  await expect(timer).toHaveCount(0);
});
