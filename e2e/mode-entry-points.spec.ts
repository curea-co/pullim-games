// Plan E Phase 5 — 홈/허브 mode 진입점 검증.
// 홈 페이지는 gamesPlayed === 0 시 EmptyDashboard 만 노출 (RecommendationCard 미 렌더링) — 본 케이스 e2e 비결정적.
// 본 테스트는 (1) 게임 허브 ModeChipsRow + (2) 게임 허브 RecommendationCard 상의 alt-modes 검증.

import { test, expect } from "@playwright/test";

test("게임 허브 — ModeChipsRow 노출 + RecommendationCard 의 alt-modes 노출", async ({
  page,
}) => {
  await page.goto("/games");
  await page.waitForLoadState("networkidle");

  // 1) 허브 mode chip row
  const hubChips = page.getByTestId("hub-mode-chips");
  await expect(hubChips).toBeVisible();
  await expect(hubChips.getByText(/타임어택/)).toBeVisible();
  await expect(hubChips.getByText(/잊혀가는 카드/)).toBeVisible();
  await expect(hubChips.getByText(/오늘 카드/)).toBeVisible();

  // 2) 추천 카드 alt-modes — Suspense fallback null 일 수 있어 timeout 여유 둠
  const recAlt = page.getByTestId("recommendation-alt-modes");
  await expect(recAlt).toBeVisible({ timeout: 10_000 });
});

test("게임 허브 — ModeChipsRow 타임어택 클릭 시 ?mode=time-attack 진입", async ({
  page,
}) => {
  await page.goto("/games");
  await page.waitForLoadState("networkidle");
  const chips = page.getByTestId("hub-mode-chips");
  await expect(chips).toBeVisible();

  const taLink = chips.getByRole("link", { name: /타임어택/ });
  await taLink.click();
  await page.waitForURL(/\?mode=time-attack/);
  await expect(page).toHaveURL(/\?mode=time-attack/);
  // 진입 후 timer 노출
  const timer = page.getByTestId("time-attack-timer");
  await expect(timer).toBeVisible({ timeout: 5_000 });
});
