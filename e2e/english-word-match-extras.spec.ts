// english-word-match — 5개 매칭 → 다음 활성화 → 남은 2개도 정답 처리 fix 검증.
// 사용자 시나리오: 통과 조건은 5/5 인데 화면엔 7개 떠 있어서 사용자가 남은 2개도 매칭 시도.
// 의미상 정답 짝 (maintain↔유지하다, oppose↔반대하다) 가 정답 처리되어야 함.

import { test, expect } from "@playwright/test";

test("5개 매칭 후 남은 2개도 정답 매칭 가능", async ({ page }) => {
  await page.goto("/games/english-word-match");

  await expect(page.getByRole("heading", { name: "짝을 맞춰주세요" })).toBeVisible();
  await expect(page.getByText("매칭 0 / 5")).toBeVisible();

  // 7개 모두 노출 (pairs 5 + extras 2)
  const allEnglish = ["pursue", "contradict", "perceive", "distinguish", "regulate", "maintain", "oppose"];
  const allKorean = ["추구하다", "모순되다", "인식하다", "구별하다", "조절하다", "유지하다", "반대하다"];
  for (const en of allEnglish) {
    await expect(page.getByRole("button", { name: en, exact: true })).toBeVisible();
  }
  for (const ko of allKorean) {
    await expect(page.getByRole("button", { name: ko, exact: true })).toBeVisible();
  }

  // 본 pairs 5개 매칭
  const pairs: Array<[string, string]> = [
    ["pursue", "추구하다"],
    ["contradict", "모순되다"],
    ["perceive", "인식하다"],
    ["distinguish", "구별하다"],
    ["regulate", "조절하다"],
  ];
  for (let i = 0; i < pairs.length; i += 1) {
    const [en, ko] = pairs[i]!;
    await page.getByRole("button", { name: en, exact: true }).click();
    await page.getByRole("button", { name: ko, exact: true }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(`매칭 ${i + 1} / 5`)).toBeVisible();
  }

  // 5/5 매칭 → "다음" 버튼 활성화
  const nextBtn = page.getByRole("button", { name: /다음/ });
  await expect(nextBtn).toBeEnabled();

  // ⚠️ 핵심: 남은 2개 (extras) 도 매칭 가능. 의미상 정답이므로 오답 처리되면 안 됨.
  await page.getByRole("button", { name: "maintain", exact: true }).click();
  await page.getByRole("button", { name: "유지하다", exact: true }).click();
  await page.waitForTimeout(500);

  // 매칭 카운트 6 으로 증가 (오답 X)
  await expect(page.getByText("매칭 6 / 5")).toBeVisible();
  // 오답 카운트 표시 안 됨 (== 0)
  await expect(page.locator("text=오답")).toHaveCount(0);
  // 다음 버튼 여전히 활성
  await expect(nextBtn).toBeEnabled();

  // 마지막 짝 (oppose ↔ 반대하다) 매칭
  await page.getByRole("button", { name: "oppose", exact: true }).click();
  await page.getByRole("button", { name: "반대하다", exact: true }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText("매칭 7 / 5")).toBeVisible();
  await expect(page.locator("text=오답")).toHaveCount(0);
  await expect(nextBtn).toBeEnabled();
});

test("extras 와 본 pairs 간 잘못된 매칭은 여전히 오답", async ({ page }) => {
  await page.goto("/games/english-word-match");

  // pursue (본 pair) ↔ 반대하다 (extras) → 오답
  await page.getByRole("button", { name: "pursue", exact: true }).click();
  await page.getByRole("button", { name: "반대하다", exact: true }).click();
  await page.waitForTimeout(700);
  await expect(page.getByText(/오답 1/)).toBeVisible();
  await expect(page.getByText("매칭 0 / 5")).toBeVisible();

  // maintain (extras) ↔ 모순되다 (본 pair) → 오답
  await page.getByRole("button", { name: "maintain", exact: true }).click();
  await page.getByRole("button", { name: "모순되다", exact: true }).click();
  await page.waitForTimeout(700);
  await expect(page.getByText(/오답 2/)).toBeVisible();
});
