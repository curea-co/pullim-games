// vocab-typing 한글 정답 인식 회귀 — typing 메커닉 한글 입력 회귀 보호.
// 원래 english-vocab-typing-case.spec.ts 에 있었으나 PR #90 codex round 2 지적에 따라
// nightly per-game extras 매핑이 단일 게임 1:1 이도록 본 파일로 분리.
//
// memory 룰: feedback_user_intent_literal — "사용자가 X했는데 틀렸대. 맞잖아" = 시스템 fix.

import { test, expect } from "@playwright/test";

test("한글 vocab-typing 정답 인식 회귀 0 — 모순", async ({ page }) => {
  await page.goto("/home");
  await page.evaluate(() => localStorage.clear());

  await page.goto("/games/vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await input.waitFor({ state: "visible" });
  await input.fill("모순");
  await page.getByRole("button", { name: "확인" }).click();

  await expect(page.getByText("오답")).not.toBeVisible({ timeout: 1500 });
  await page.waitForTimeout(800);
  await expect(page.getByRole("button", { name: /다음|마치기/ })).toBeEnabled();
});
