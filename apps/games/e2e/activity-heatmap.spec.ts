// 활동 히트맵 — 게임별 × 14일.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 2.
//
// 2026-07-02: seedGuestSession 추가 — 입구 게이트(middleware 쿠키 + RequireIdentity localStorage)
// 통과 없이는 /home·/games/* 에서 콘텐츠 미렌더 → locator.waitFor 타임아웃.
// localStorage.clear() 이후에도 게스트 프로필을 재주입해 게이트를 유지한다.
// plan: proc/plan/2026-06-30_e2e-infra-fix.md §2 H2 fix.

import { test, expect } from "@playwright/test";
import { seedGuestSession } from "./helpers/auth";

test("정답 1회 후 → 홈에 활동 히트맵 노출 + 셀 1개 채워짐", async ({
  page,
  context,
}) => {
  // localStorage.clear() 전에 먼저 시드 — goto 호출 전에 addInitScript 등록 필요.
  // clear() 이후에도 쿠키(pullim_games_guest)는 context 에 살아있어 미들웨어는 통과하지만,
  // localStorage(pullim-games:player)가 지워지면 RequireIdentity 가 "/" 로 튕긴다.
  // 따라서 clear() 이후 게임 goto 전에 seedGuestSession 을 재호출한다.
  await seedGuestSession(page, context);
  await page.goto("/home");
  await page.evaluate(() => localStorage.clear());

  // vocab-typing 첫 카드 정답 → saveSrsAndRecord 동거 wrapper 가 activity-log 갱신.
  // clear() 로 player profile 이 지워졌으므로 재시드 후 game 진입.
  await seedGuestSession(page, context);
  await page.goto("/games/vocab-typing");
  const input = page.getByPlaceholder("입력해주세요");
  await input.waitFor({ state: "visible" });
  await input.fill("모순");
  await page.getByRole("button", { name: "확인" }).click();
  await page.waitForTimeout(800);

  // 홈에 다시 진입 — 히트맵 보임
  await page.goto("/home");
  const heatmap = page.getByRole("region", { name: "최근 활동 히트맵" });
  await expect(heatmap).toBeVisible();
  await expect(heatmap.getByText("최근 활동")).toBeVisible();
  // footer 합산 — "14일 중 N일 · 총 N장"
  await expect(heatmap.getByText(/일 중 \d+일 · 총 \d+장/)).toBeVisible();

  // localStorage 확인 — activity-log 키 존재 + 오늘 bucket count >= 1
  const activity = await page.evaluate(() => {
    const raw = localStorage.getItem("pullim-games:activity-log:vocab-typing");
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  });
  expect(activity).toBeTruthy();
  // 오늘 bucket 적어도 1
  const total = Object.values(activity ?? {}).reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThanOrEqual(1);
});

test("미플레이 사용자 — 히트맵 미노출 (playedStats 0)", async ({
  page,
  context,
}) => {
  // 게스트 세션 먼저 시드 → 미들웨어 + RequireIdentity 게이트 통과.
  await seedGuestSession(page, context);
  await page.goto("/home");

  // 게임 활동 기록만 초기화(activity-log·SRS 등) — player profile 은 보존해 게이트 유지.
  // "미플레이 사용자" = 프로필은 있으나 게임 플레이 이력 없는 상태.
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

  await page.goto("/home");
  // 미플레이여도 홈은 대시보드 골격을 렌더하지만, ActivityHeatmap 은 playedStats > 0
  // 일 때만 렌더 → 히트맵 자체 미노출(2026-07-05: EmptyDashboard 분기 제거 후에도 동일).
  const heatmap = page.getByRole("region", { name: "최근 활동 히트맵" });
  await expect(heatmap).toHaveCount(0);
});
