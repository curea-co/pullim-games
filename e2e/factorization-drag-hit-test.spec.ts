// factorization — block 자유 드래그 + drop zone hit-test 검증 (audit BUG-2 fix).
//
// 시나리오:
// 1. block 을 drop zone 밖 (왼쪽 빈 공간) 으로 드래그 후 release → success X (idle 복귀)
// 2. block 을 drop zone 영역 위로 드래그 후 release → success O (extracting → done)

import { test, expect } from "@playwright/test";

test("block 을 drop zone 밖 (위쪽 허허벌판) 에 놓으면 success 아님", async ({
  page,
}) => {
  await page.goto("/games/factorization");

  // 첫 카드 block + dropZone 위치 측정
  const block = page.locator("[class*=cursor-grab]").first();
  const dropZone = page.locator('[aria-label="공통인수 드롭 존"]');
  await expect(block).toBeVisible();
  await expect(dropZone).toBeVisible();

  const blockBox = await block.boundingBox();
  const dzBox = await dropZone.boundingBox();
  if (!blockBox || !dzBox) throw new Error("boundingBox null");

  // block 시작 center → 위쪽 빈 공간 (dropZone 보다 한참 위)
  const startX = blockBox.x + blockBox.width / 2;
  const startY = blockBox.y + blockBox.height / 2;
  const endX = startX;
  const endY = startY - 200; // dropZone 의 정 반대 방향

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // 단계적 이동 (framer-motion onDrag 트리거)
  for (let i = 1; i <= 8; i += 1) {
    await page.mouse.move(startX + (endX - startX) * (i / 8), startY + (endY - startY) * (i / 8));
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);

  // block 이 아직 화면에 있고 (success 처리 안 됨) "다음" 버튼 비활성
  await expect(block).toBeVisible();
  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeDisabled();
});

test("block 을 drop zone 영역으로 옮기면 success → 다음 활성", async ({
  page,
}) => {
  await page.goto("/games/factorization");

  const block = page.locator("[class*=cursor-grab]").first();
  const dropZone = page.locator('[aria-label="공통인수 드롭 존"]');
  await expect(block).toBeVisible();
  await expect(dropZone).toBeVisible();

  const blockBox = await block.boundingBox();
  const dzBox = await dropZone.boundingBox();
  if (!blockBox || !dzBox) throw new Error("boundingBox null");

  // block center 가 dropZone center 로 가도록
  const startX = blockBox.x + blockBox.width / 2;
  const startY = blockBox.y + blockBox.height / 2;
  const endX = dzBox.x + dzBox.width / 2;
  const endY = dzBox.y + dzBox.height / 2;

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
  await page.waitForTimeout(600);

  // 다음 버튼 활성
  const nextBtn = page.getByRole("button", { name: /다음|마치기/ });
  await expect(nextBtn).toBeEnabled();
});
