// 활동 히트맵 — 게임별 × 14일.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 2.

import { test, expect } from "@playwright/test";

test("정답 1회 후 → 홈에 활동 히트맵 노출 + 셀 1개 채워짐", async ({
  page,
}) => {
  await page.goto("/home");
  await page.evaluate(() => localStorage.clear());

  // vocab-typing 첫 카드 정답 → saveSrsAndRecord 동거 wrapper 가 activity-log 갱신
  await page.goto("/games/vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await input.waitFor({ state: "visible" });
  await input.fill("모순");
  await page.getByRole("button", { name: "확인" }).click();
  await page.waitForTimeout(800);

  // 홈에 다시 진입 — 히트맵 보임
  await page.goto("/home");
  const heatmap = page.getByRole("region", { name: "최근 활동 히트맵" });
  await expect(heatmap).toBeVisible();
  await expect(heatmap.getByText("최근 활동")).toBeVisible();
  // footer 합산 — "14일 중 N일 · 총 N장"
  await expect(heatmap.getByText(/일 중 \d+일 · 총 \d+장/)).toBeVisible();

  // localStorage 확인 — activity-log 키 존재 + 오늘 bucket count >= 1
  const activity = await page.evaluate(() => {
    const raw = localStorage.getItem("pullim-games:activity-log:vocab-typing");
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  });
  expect(activity).toBeTruthy();
  // 오늘 bucket 적어도 1
  const total = Object.values(activity ?? {}).reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThanOrEqual(1);
});

test("미플레이 사용자 — 히트맵 미노출 (playedStats 0)", async ({ page }) => {
  await page.goto("/home");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/home");
  // gamesPlayed === 0 이면 EmptyDashboard 분기 → 히트맵 자체 미렌더
  const heatmap = page.getByRole("region", { name: "최근 활동 히트맵" });
  await expect(heatmap).toHaveCount(0);
});
