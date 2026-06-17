// factorization — block 자유 드래그 + 빈 공간 release 회귀 (audit BUG-2 fix 보존).
//
// Phase 2 (drag-to-chip) 전환 후 갱신:
//   - drop zone aria 제거됨, chip rack 으로 대체.
//   - 본 spec 은 BUG-2 회귀 보존만 검증 — block 을 빈 공간에 release 시 변동 없음.
//   - 정답/오답 chip 판정은 factorization-discrimination.spec.ts 참조.

import { test, expect } from "@playwright/test";

test("block 을 chip 후보 밖 빈 공간에 놓으면 변동 없음 (BUG-2 회귀)", async ({
  page,
}) => {
  await page.goto("/games/factorization");

  const block = page.locator("[class*=cursor-grab]").first();
  await expect(block).toBeVisible();

  const blockBox = await block.boundingBox();
  if (!blockBox) throw new Error("blockBox null");

  // block 시작 center → 위쪽 빈 공간 (chip rack 영역 외)
  const startX = blockBox.x + blockBox.width / 2;
  const startY = blockBox.y + blockBox.height / 2;
  const endX = startX;
  const endY = startY - 240;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) {
    await page.mouse.move(
      startX + (endX - startX) * (i / 8),
      startY + (endY - startY) * (i / 8),
    );
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);

  // block 그대로 화면에 있고 (success 처리 안 됨), 다음 버튼 비활성
  await expect(block).toBeVisible();
  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeDisabled();
});
