// typing 메커닉 — 5회 오답 누적 시 RevealBanner + 정답 자동 노출 + "다음" 활성.
// plan: proc/plan/2026-05-14_correct-feedback-and-5x-reveal.md §E

import { test, expect } from "@playwright/test";

test("vocab-typing 5회 오답 → RevealBanner + 다음 활성", async ({ page }) => {
  await page.goto("/games/vocab-typing");

  const input = page.getByPlaceholder("입력해주세요");
  await expect(input).toBeVisible();

  const submitBtn = page.getByRole("button", { name: "확인" });

  // 의도적으로 정답이 될 수 없는 잘못된 한 글자 입력을 5회 제출
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await input.fill("ㅁ");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    // 5회째 직전까지는 wrong → playing 으로 1.2s 후 복귀
    if (attempt < 5) {
      await expect(page.getByText(`오답 ${attempt}회`)).toBeVisible();
      // wrong-flash 후 input 자동 reset & focus 복귀
      await expect(input).toBeEnabled({ timeout: 2000 });
    }
  }

  // 5회 도달 — RevealBanner 노출 + 다음 버튼 활성
  await expect(
    page.getByText("여러 번 시도했어요. 정답을 보여줄게요."),
  ).toBeVisible();
  await expect(page.getByText("시도 5회")).toBeVisible();

  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeEnabled();
});
