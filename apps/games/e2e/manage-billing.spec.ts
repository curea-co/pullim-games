// /manage/billing — 결제 진입점 + V1 placeholder.
// plan: proc/plan/2026-05-18_subscription-cta-entry.md §3 Phase 1
//       + proc/plan/2026-05-19_plan-d-v2-billing-and-sanitize.md §3 Phase 2.
//
// 정책 갱신 (2026-05-20 — Codex review fix):
// - hash-only 모델 폐기. 외부 메일 서비스(Resend) 즉시 위임 (SPEC §05.7.5).
// - 클라이언트는 plain email 전송. 본 서버는 라우트 처리 후 변수 폐기 — 저장 0.

import { test, expect } from "@playwright/test";

test("/manage/billing 진입 — 4 섹션 렌더 + 알림 신청 → POST /api/billing/notify (외부 위임)", async ({
  page,
}) => {
  // Phase 2: 알림 신청은 실제 POST 호출. Resend 호출은 라우트 mock 으로 차단.
  // round 10 fix #1 — CSRF 토큰 발급 라우트도 mock (브라우저 cookie jar 자동 처리).
  const notifyRequests: Array<{ payload: unknown; status: number }> = [];
  let csrfRequests = 0;
  await page.route("**/api/billing/notify/csrf", async (route) => {
    csrfRequests++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        // 실제 라우트의 Set-Cookie 와 동일 정책 — 브라우저가 다음 POST 에 동봉.
        "set-cookie":
          "pullim-csrf-billing-notify=e2etoken; Path=/api/billing/notify; SameSite=Strict; Max-Age=3600",
      },
      body: JSON.stringify({ ok: true }),
    });
  });
  // POST mock — `/api/billing/notify` 정확 매칭 (csrf 하위 라우트 제외).
  await page.route("**/api/billing/notify", async (route) => {
    // csrf 하위 경로는 이미 위 라우트가 가져갔으므로 본 핸들러엔 안 옴 — 안전.
    if (route.request().url().endsWith("/csrf")) {
      await route.continue();
      return;
    }
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

  // §4 알림 신청 form — 실 POST 호출 (plain email + 외부 위임 명시)
  await expect(page.getByText("출시 알림 받기")).toBeVisible();
  const email = page.getByLabel("이메일 주소");
  const submit = page.getByRole("button", { name: "신청" });
  await email.fill("user@example.com");
  await submit.click();

  // 외부 위임 정직성 카피 검증 — role=status (success state) 안에서 1건만.
  const status = page.getByRole("status");
  await expect(status).toBeVisible();
  await expect(status).toContainText("출시 시 알림을 받기 위해 신청됐어요");
  await expect(status).toContainText("외부 서비스(Resend)");
  await expect(status).toContainText("풀림 서버에는 이메일이 저장되지 않아요");

  // POST 호출 페이로드 검증
  expect(notifyRequests).toHaveLength(1);
  const req = notifyRequests[0].payload as Record<string, unknown>;
  expect(req.action).toBe("billing.notify.signup");
  expect(req.email).toBe("user@example.com");
  expect(req.source).toBe("billing-cta");
  expect(typeof req.ts).toBe("number");

  // [strict 회귀] legacy hash 필드는 포함되지 않음
  expect(req.emailHash).toBeUndefined();
  // [strict 회귀] 정의되지 않은 추가 필드 0 — 4 필드만 (action·email·source·ts)
  expect(Object.keys(req).sort()).toEqual(["action", "email", "source", "ts"]);

  // round 10 fix #1 — CSRF 라우트가 submit 직전에 호출됐는지 확인.
  expect(csrfRequests).toBeGreaterThanOrEqual(1);
});

test("관리 탭 — 6번째 '결제' 탭 존재 + 활성 강조", async ({ page }) => {
  await page.goto("/manage/billing");
  const tab = page.getByRole("link", { name: "결제" });
  await expect(tab).toBeVisible();
  await expect(tab).toHaveAttribute("aria-current", "page");
});
