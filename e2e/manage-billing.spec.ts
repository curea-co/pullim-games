// /manage/billing — 결제 진입점 + V1 placeholder.
// plan: proc/plan/2026-05-18_subscription-cta-entry.md §3 Phase 1
//       + proc/plan/2026-05-19_plan-d-v2-billing-and-sanitize.md §3 Phase 2.

import { test, expect } from "@playwright/test";

test("/manage/billing 진입 — 4 섹션 렌더 + 알림 신청 → POST /api/billing/notify (hash only)", async ({
  page,
}) => {
  // Phase 2: 알림 신청은 실제 POST 호출. 이메일 원문은 절대 페이로드에 포함되면 안 됨.
  const notifyRequests: Array<{ payload: unknown; status: number }> = [];
  await page.route("**/api/billing/notify", async (route) => {
    const post = route.request().postDataJSON();
    notifyRequests.push({ payload: post, status: 200 });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

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

  // §4 알림 신청 form — 실 POST 호출 (hash 만 전송)
  await expect(page.getByText("출시 알림 받기")).toBeVisible();
  const email = page.getByLabel("이메일 주소");
  const submit = page.getByRole("button", { name: "신청" });
  await email.fill("user@example.com");
  await submit.click();

  // 정직성 강화 카피 검증
  await expect(
    page.getByText(/출시 시 알림을 받기 위해 신청됐어요/),
  ).toBeVisible();
  await expect(page.getByText(/해시\(hash\) 처리되어 저장/)).toBeVisible();
  await expect(page.getByText(/6개월 후 자동 삭제/)).toBeVisible();

  // POST 호출 페이로드 검증
  expect(notifyRequests).toHaveLength(1);
  const req = notifyRequests[0].payload as Record<string, unknown>;
  expect(req.action).toBe("billing.notify.signup");
  // 이메일 원문이 페이로드 어디에도 포함되면 안 됨
  expect(JSON.stringify(req)).not.toContain("user@example.com");
  // emailHash 는 sha256 hex 64자
  expect(req.emailHash).toMatch(/^[a-f0-9]{64}$/);
  expect(typeof req.ts).toBe("number");
});

test("관리 탭 — 6번째 '결제' 탭 존재 + 활성 강조", async ({ page }) => {
  await page.goto("/manage/billing");
  const tab = page.getByRole("link", { name: "결제" });
  await expect(tab).toBeVisible();
  await expect(tab).toHaveAttribute("aria-current", "page");
});
