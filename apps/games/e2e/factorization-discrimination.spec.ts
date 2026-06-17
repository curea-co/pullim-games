// factorization — drag-to-chip 메커닉 변별력 검증.
// plan 2026-05-14_factorization-discrimination §3 Phase 4.
//
// 시나리오:
//   1) 첫 카드 (card-001, "2x + 4", 정답 "2") 의 정답 chip 위에 block drop → success
//   2) 오답 chip 위에 drop → spring-back + 카드 유지 (다음 버튼 비활성)
//   3) 오답 3회 후 "정답을 보여드릴게요" voluntary reveal 옵션 노출 → 클릭 시 reveal
//
// 메모: fresh playwright context 는 localStorage 비어있어 첫 카드 = card-001
// (FSRS shuffle 안 됨). 정답 chip 텍스트는 "2" 로 고정.

import { test, expect } from "@playwright/test";

async function dragBlockOntoChip(
  page: import("@playwright/test").Page,
  blockSelector: string,
  chipText: string,
) {
  const block = page.locator(blockSelector).first();
  const chip = page.locator(`[data-chip-text="${chipText}"]`);
  await expect(block).toBeVisible();
  await expect(chip).toBeVisible();

  const blockBox = await block.boundingBox();
  const chipBox = await chip.boundingBox();
  if (!blockBox || !chipBox) throw new Error("boundingBox null");

  const startX = blockBox.x + blockBox.width / 2;
  const startY = blockBox.y + blockBox.height / 2;
  const endX = chipBox.x + chipBox.width / 2;
  const endY = chipBox.y + chipBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(
      startX + (endX - startX) * (i / 10),
      startY + (endY - startY) * (i / 10),
    );
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
}

test("정답 chip 에 block drop → success → 다음 활성", async ({ page }) => {
  await page.goto("/games/factorization");

  // card-001 "2x + 4" 정답 = "2"
  await expect(page.locator('[data-chip-text="2"]')).toBeVisible();

  await dragBlockOntoChip(page, "[class*=cursor-grab]", "2");
  await page.waitForTimeout(700);

  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeEnabled();
});

test("오답 chip 에 block drop → spring-back + 카드 유지 (다음 비활성)", async ({
  page,
}) => {
  await page.goto("/games/factorization");

  // 오답 chip 찾기 — 정답 "2" 가 아닌 chip 하나
  const allChips = page.locator("[data-chip-text]");
  await expect(allChips.first()).toBeVisible();
  const chipTexts = await allChips.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-chip-text")!),
  );
  const wrongChipText = chipTexts.find((t) => t !== "2");
  if (!wrongChipText) throw new Error("no wrong chip found");

  await dragBlockOntoChip(page, "[class*=cursor-grab]", wrongChipText);
  await page.waitForTimeout(600);

  // block 그대로 노출 (success 처리 안 됨), 다음 비활성
  await expect(page.locator("[class*=cursor-grab]").first()).toBeVisible();
  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeDisabled();
});

test("오답 3회 → '정답을 보여드릴게요' voluntary reveal 옵션 노출", async ({
  page,
}) => {
  await page.goto("/games/factorization");

  const allChips = page.locator("[data-chip-text]");
  await expect(allChips.first()).toBeVisible();
  const chipTexts = await allChips.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-chip-text")!),
  );
  const wrongChipText = chipTexts.find((t) => t !== "2");
  if (!wrongChipText) throw new Error("no wrong chip found");

  // 3회 오답 chip drop
  for (let i = 1; i <= 3; i += 1) {
    await dragBlockOntoChip(page, "[class*=cursor-grab]", wrongChipText);
    await page.waitForTimeout(400);
  }

  // voluntary reveal 옵션 노출
  const revealBtn = page.getByRole("button", { name: "정답을 보여드릴게요" });
  await expect(revealBtn).toBeVisible();

  // 클릭 → reveal 진입 → RevealBanner (role=status) + 다음 활성
  await revealBtn.click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("정답을 보여줄게요");
  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeEnabled();
});
