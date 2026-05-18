// 홈 대시보드 landscape grid 레이아웃 — 추천 상단 + status row 3 chip.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 1.

import { test, expect } from "@playwright/test";

// 첫 활동 시드 — gamesPlayed > 0 보장 (Dashboard render path 진입).
async function seedActivity(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/games/vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await input.waitFor({ state: "visible" });
  await input.fill("모순");
  await page.getByRole("button", { name: "확인" }).click();
  await page.waitForTimeout(800);
}

test("홈 대시보드 — 추천 영역이 status row 보다 위 (모바일)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedActivity(page);
  await page.goto("/");

  const rec = page.getByRole("region", { name: "오늘의 추천" });
  const status = page.getByRole("region", { name: "학습 상태" });
  await expect(rec).toBeVisible();
  await expect(status).toBeVisible();

  const recBox = await rec.boundingBox();
  const statusBox = await status.boundingBox();
  if (!recBox || !statusBox) throw new Error("bbox not measured");
  expect(recBox.y).toBeLessThan(statusBox.y);
});

test("status row — 3 chip (오늘·다시 만날 카드·연속 학습)", async ({ page }) => {
  await seedActivity(page);
  await page.goto("/");

  const status = page.getByRole("region", { name: "학습 상태" });
  await expect(status.getByText("오늘")).toBeVisible();
  await expect(status.getByText("다시 만날 카드")).toBeVisible();
  await expect(status.getByText("연속 학습")).toBeVisible();
});

test("와이드 viewport — 추천 + status row 가 가로 배치 (lg 12-col grid)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedActivity(page);
  await page.goto("/");

  const rec = page.getByRole("region", { name: "오늘의 추천" });
  const status = page.getByRole("region", { name: "학습 상태" });
  const recBox = await rec.boundingBox();
  const statusBox = await status.boundingBox();
  if (!recBox || !statusBox) throw new Error("bbox not measured");
  // 와이드에서는 추천과 status row 가 같은 y(±50px) 에 있어야 함 — gap-5 허용.
  expect(Math.abs(recBox.y - statusBox.y)).toBeLessThan(80);
  // 추천이 status 보다 왼쪽
  expect(recBox.x).toBeLessThan(statusBox.x);
});
