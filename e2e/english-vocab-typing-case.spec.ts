// english-vocab-typing 대소문자 무관 정답 매칭 — C2 fix 회귀 보호.
// plan: proc/plan/2026-05-19_codebase-review-followup.md Phase 1 C2.
//
// memory 룰: feedback_user_intent_literal — "사용자가 X했는데 틀렸대. 맞잖아" = 시스템 fix.

import { test, expect } from "@playwright/test";

test("대문자로 시작한 정답도 정답으로 인식 — Achieve (실제 answer: achieve)", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  await page.goto("/games/english-vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await input.waitFor({ state: "visible" });
  await input.fill("Achieve");
  await page.getByRole("button", { name: "확인" }).click();

  // 오답이면 wrongCount 증가 (wrong-flash) — 본 fix 후에는 발생 X
  await expect(page.getByText("오답")).not.toBeVisible({ timeout: 1500 });

  // 정답 인식 시 다음 카드 노출 (또는 다음 버튼 활성)
  await page.waitForTimeout(800);
  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeEnabled();
});

test("전부 대문자 입력 — ACHIEVE", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  await page.goto("/games/english-vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await input.waitFor({ state: "visible" });
  await input.fill("ACHIEVE");
  await page.getByRole("button", { name: "확인" }).click();

  await expect(page.getByText("오답")).not.toBeVisible({ timeout: 1500 });
  await page.waitForTimeout(800);
  await expect(page.getByRole("button", { name: /다음|마치기/ })).toBeEnabled();
});

// 한글 vocab-typing 회귀 케이스는 PR #90 codex round 2 (r3...) 지적에 따라
// e2e/vocab-typing-case.spec.ts 로 분리됨. extras path 매핑이 단일 게임 1:1 이도록.
