// 일일 학습 스트릭 — 게임 카드 정답 후 localStorage 영속화 검증.
// plan 2026-05-15_fsrs-streak-backbone §3 Phase 5.

import { test, expect } from "@playwright/test";

test("게임 카드 정답 → streak 첫 활동 기록 (current=1)", async ({ page }) => {
  // 깨끗한 상태 — localStorage 초기화 (홈 진입 후 clear)
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  // vocab-typing 진입 + 첫 카드 ("모순") 정답
  await page.goto("/games/vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await expect(input).toBeVisible();
  await input.fill("모순");
  await page.getByRole("button", { name: "확인" }).click();
  await page.waitForTimeout(600);

  // streak.current === 1, lastActiveDate 형식 YYYY-MM-DD
  const streak = await page.evaluate(() => {
    const raw = localStorage.getItem("pullim-games:streak");
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  });
  expect(streak).toBeTruthy();
  expect(streak!.current).toBe(1);
  expect(streak!.longest).toBe(1);
  expect(streak!.lastActiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("홈 dashboard — streak.current >= 2 일 시 'N일 연속' 노출", async ({
  page,
}) => {
  // localStorage 시드 — streak + 1 SRS state (gamesPlayed > 0 보장)
  await page.addInitScript(() => {
    const today = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();
    localStorage.setItem(
      "pullim-games:streak",
      JSON.stringify({ current: 5, longest: 5, lastActiveDate: today }),
    );
    localStorage.setItem(
      "pullim-games:srs:vocab-typing:vt-001",
      JSON.stringify({
        fsrsCard: {
          due: new Date(Date.now() + 86_400_000).toISOString(),
          last_review: new Date().toISOString(),
          stability: 1,
          difficulty: 5,
          elapsed_days: 0,
          scheduled_days: 1,
          reps: 1,
          lapses: 0,
          state: 2,
          learning_steps: 0,
        },
        reviewCount: 1,
        lastReviewAt: new Date().toISOString(),
      }),
    );
  });

  await page.goto("/");
  // 홈 대시보드 §status row — "연속 학습" 칩에 "5일" 노출 (current >= 2).
  const status = page.getByRole("region", { name: "학습 상태" });
  await expect(status.getByText("연속 학습")).toBeVisible();
  await expect(status.getByText("5일")).toBeVisible();
});
