// /games 의 "나만의 게임" 영역 CTA 검증.
// plan: proc/archive/plan/2026-05-13_custom-games-cta.md (D1=A).
//
// 1. 빈 상태 — 영역 전체 클릭 → /manage/content navigation
// 2. 채워진 상태 — 하단 "카드 더 만들기" 버튼 클릭 → /manage/content navigation
// 3. 빈 상태 키보드 — Tab → Enter → navigation

import { test, expect } from "@playwright/test";
import { seedCustomGames } from "./helpers/seed";

test("빈 상태 — 나만의 게임 영역 전체가 CTA, 클릭 시 /manage/content 진입", async ({
  page,
}) => {
  // seed 안 함 → custom counts = 0
  await page.goto("/games");

  // 빈 상태 영역 전체가 "첫 카드 만들기" Link
  const emptyCta = page.getByRole("link", { name: "첫 카드 만들기" });
  await expect(emptyCta).toBeVisible();

  await emptyCta.click();
  await page.waitForURL(/\/manage\/content/);
  expect(page.url()).toContain("/manage/content");
});

test("채워진 상태 — '카드 더 만들기' 버튼 클릭 시 /manage/content 진입", async ({
  page,
}) => {
  await seedCustomGames(page);
  await page.goto("/games");

  // 채워진 상태 헤더 — 부제에 "총 N장" 노출
  await expect(page.getByText(/총 \d+장 — 메커닉별로 골라 풀어보세요/)).toBeVisible();

  // 하단 full-width "카드 더 만들기" 링크
  const moreCta = page.getByRole("link", { name: "카드 더 만들기" });
  await expect(moreCta).toBeVisible();

  await moreCta.click();
  await page.waitForURL(/\/manage\/content/);
  expect(page.url()).toContain("/manage/content");
});

test("빈 상태 — 키보드 Tab focus + Enter 로 진입", async ({ page }) => {
  await page.goto("/games");

  const emptyCta = page.getByRole("link", { name: "첫 카드 만들기" });
  await emptyCta.focus();
  await expect(emptyCta).toBeFocused();

  await page.keyboard.press("Enter");
  await page.waitForURL(/\/manage\/content/);
  expect(page.url()).toContain("/manage/content");
});
