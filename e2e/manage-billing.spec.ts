// /manage/billing — 결제 진입점 + V1 placeholder.
// plan: proc/plan/2026-05-18_subscription-cta-entry.md §3 Phase 1.

import { test, expect } from "@playwright/test";

test("/manage/billing 진입 — 4 섹션 렌더 + 알림 신청 mock toast", async ({
  page,
}) => {
  await page.goto("/manage/billing");

  // §1 헤더
  await expect(
    page.getByRole("heading", { name: "결제", level: 2 }),
  ).toBeVisible();

  // §2 현재 플랜
  await expect(
    page.getByRole("heading", { name: "현재 플랜", level: 3 }),
  ).toBeVisible();
  await expect(page.getByText("무료", { exact: true })).toBeVisible();

  // §3 유료 플랜 preview
  await expect(page.getByText("유료 플랜 (준비 중)")).toBeVisible();

  // §4 알림 신청 form
  await expect(page.getByText("출시 알림 받기")).toBeVisible();
  const email = page.getByLabel("이메일 주소");
  const submit = page.getByRole("button", { name: "신청" });
  await email.fill("user@example.com");
  await submit.click();
  await expect(
    page.getByText("신청이 완료되었어요. 출시 시 알림을 보내드릴게요."),
  ).toBeVisible();
});

test("관리 탭 — 6번째 '결제' 탭 존재 + 활성 강조", async ({ page }) => {
  await page.goto("/manage/billing");
  const tab = page.getByRole("link", { name: "결제" });
  await expect(tab).toBeVisible();
  await expect(tab).toHaveAttribute("aria-current", "page");
});
