// 홈 대시보드 레이아웃 — 추천 상단 + status row 3 chip + KPI 2 + 히트맵 stack.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 1.
//
// 행렬 정렬 우선 (fix/home-dashboard-grid-and-heatmap) — 모든 row 가 full-width stack.
//
// 2026-07-02: seedGuestSession 추가 — 입구 게이트 통과 없이 /home 콘텐츠 미렌더.
// plan: proc/plan/2026-06-30_e2e-infra-fix.md §2 H2 fix.

import { test, expect } from "@playwright/test";
import type { Page, BrowserContext } from "@playwright/test";
import { seedGuestSession } from "./helpers/auth";

// 첫 활동 시드 — gamesPlayed > 0 보장 (Dashboard render path 진입).
// localStorage.clear() 로 게스트 프로필까지 지워지므로 clear 이후 재시드가 필요.
async function seedActivity(page: Page, context: BrowserContext) {
  // 초기 시드 (첫 goto 전 addInitScript 등록용)
  await seedGuestSession(page, context);
  await page.goto("/home");
  // 이전 학습 데이터 초기화 (profile 보존)
  await page.evaluate(() => {
    const PREFIX = "pullim-games:";
    const KEEP = "pullim-games:player";
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== KEEP) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  });
  // vocab-typing 첫 카드 정답
  await seedGuestSession(page, context);
  await page.goto("/games/vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await input.waitFor({ state: "visible" });
  await input.fill("모순");
  await page.getByRole("button", { name: "확인" }).click();
  await page.waitForTimeout(800);
}

test("홈 대시보드 — 추천 영역이 status row 보다 위 (모바일)", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedActivity(page, context);
  await page.goto("/home");

  const rec = page.getByRole("region", { name: "오늘의 추천" });
  const status = page.getByRole("region", { name: "학습 상태" });
  await expect(rec).toBeVisible();
  await expect(status).toBeVisible();

  const recBox = await rec.boundingBox();
  const statusBox = await status.boundingBox();
  if (!recBox || !statusBox) throw new Error("bbox not measured");
  expect(recBox.y).toBeLessThan(statusBox.y);
});

test("status row — 3 chip (오늘·다시 만날·연속) 가로 grid-cols-3", async ({
  page,
  context,
}) => {
  await seedActivity(page, context);
  await page.goto("/home");

  const status = page.getByRole("region", { name: "학습 상태" });
  await expect(status.getByText("오늘", { exact: true })).toBeVisible();
  await expect(status.getByText("다시 만날", { exact: true })).toBeVisible();
  await expect(status.getByText("연속", { exact: true })).toBeVisible();
});

test("모든 viewport — 추천·status·KPI·히트맵이 stack 순서대로 노출", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedActivity(page, context);
  await page.goto("/home");

  const rec = page.getByRole("region", { name: "오늘의 추천" });
  const status = page.getByRole("region", { name: "학습 상태" });
  const kpi = page.getByRole("region", { name: "핵심 지표" });
  const heatmap = page.getByRole("region", { name: "최근 활동 히트맵" });

  const boxes = await Promise.all(
    [rec, status, kpi, heatmap].map((el) => el.boundingBox()),
  );
  for (const b of boxes) if (!b) throw new Error("bbox not measured");
  // stack 순서: 추천 < status < KPI < 히트맵 (행 정렬, 가로 split X)
  expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);
  expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);
  expect(boxes[2]!.y).toBeLessThan(boxes[3]!.y);
});
