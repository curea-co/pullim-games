// Plan E Phase 4 — deep-recall URL 진입 검증.
// 신규 세션은 모든 카드 R=1.0 → R<0.6 필터 통과 0 → DeepRecallEmpty 노출.
// 학습 후 카드 R<0.6 만 노출 케이스는 단위 테스트 (select-for-mode.test.ts) 가 담당.

import { test, expect } from "@playwright/test";

const SAMPLE_GAMES = [
  "math-quick-quiz",
  "english-blank",
  "english-vocab-typing",
  "english-word-match",
];

for (const gameId of SAMPLE_GAMES) {
  test(`${gameId} — ?mode=deep-recall 진입 시 빈 풀 화면 노출 (신규 세션)`, async ({
    page,
  }) => {
    const res = await page.goto(`/games/${gameId}?mode=deep-recall`);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    // 신규 세션은 모든 카드 R=1.0 → R<0.6 필터 통과 0 → DeepRecallEmpty 노출.
    // 또는 게임이 자체 empty-state 화면 표시 (cards.length=0 의 단순 분기).
    const empty = page.getByTestId("deep-recall-empty");
    await expect(empty).toBeVisible({ timeout: 5_000 });
    // 안내 카피
    await expect(page.getByText("잊혀가는 카드가 없어요")).toBeVisible();
  });
}

test("default 모드는 deep-recall 안내 미노출 (?mode 미명시)", async ({ page }) => {
  const res = await page.goto(`/games/math-quick-quiz`);
  expect(res?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  const empty = page.getByTestId("deep-recall-empty");
  await expect(empty).toHaveCount(0);
});
