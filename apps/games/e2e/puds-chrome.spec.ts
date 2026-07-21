import { expect, test } from "@playwright/test";

test("pullim-jr chrome은 게임 토큰을 덮지 않고 결과 상태까지 이어진다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/games/math-quick-quiz");
  await page.waitForLoadState("networkidle");

  const shell = page.locator('.puds-jr-shell[data-theme="pullim-jr"]');
  await expect(shell).toBeVisible();
  expect(
    await shell.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--puds-primary-500").trim(),
    ),
  ).not.toBe("");

  const gameplay = page.getByTestId("game-shell-content");
  await expect(gameplay).toBeVisible();
  expect(
    await gameplay.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--radius-md").trim(),
    ),
  ).toBe("");

  const answers = ["2(x + 2)", "(x+2)(x+3)", "7", "5√2", "x = 2, 3"];
  for (const [index, answer] of answers.entries()) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await page
      .getByRole("button", {
        name: index === answers.length - 1 ? "마치기 →" : "다음 →",
        exact: true,
      })
      .click();
  }

  const result = page.locator('[data-puds-player-state="result"]');
  await expect(result).toBeVisible();
  await expect(result.getByText("5문제, 빠르게 끝났어요.")).toBeVisible();
  expect(
    await result.locator("section").evaluate((element) =>
      getComputedStyle(element, "::before").getPropertyValue("content"),
    ),
  ).toContain("✓");
});
