// 게임 페이지 chrome minimal 정책 회귀 차단 — design-audit F2 결과.
//
// 정책 (`proc/plan/2026-05-11_layout-overhaul.md` F2=B):
// - `/games/<id>` 데스크탑 진입 시:
//   - 사이드바 nav (`aria-label="풀림 게임즈 메뉴"`) DOM 부재
//   - 헤더 우측 검색·알림 버튼 부재 (placeholder 도 X)
//   - 헤더 좌측 ✕ (게임 허브로 복귀) 링크 존재 + 클릭 시 `/games` 로 navigate
// - 정책 위반 = 학습 몰입 깨짐. 시각 회귀와 별개로 selector 1줄로 자동 감지.
//
// viewport: 데스크탑 single (chrome 정책은 viewport 비종속).

import { test, expect } from "@playwright/test";
import { OFFICIAL_GAMES, CUSTOM_GAMES } from "./helpers/games";
import { seedCustomGames } from "./helpers/seed";

const DESKTOP = { width: 1280, height: 800 } as const;

// PR #90 codex round 2 — custom-* 4 게임도 chrome minimal 회귀 검증 대상.
// official 17 + custom 4 = 21 게임 1:1. custom 은 seedCustomGames 로 콘텐츠 주입.
const ALL_GAMES = [
  ...OFFICIAL_GAMES.map((g) => ({ ...g, needsSeed: false })),
  ...CUSTOM_GAMES.map((g) => ({ ...g, needsSeed: true })),
];

for (const game of ALL_GAMES) {
  test(`${game.id} @ desktop — chrome minimal (사이드바·검색·알림 부재, ✕ 존재)`, async ({
    page,
  }) => {
    if (game.needsSeed) {
      await seedCustomGames(page);
    }
    await page.setViewportSize(DESKTOP);
    const res = await page.goto(`/games/${game.id}`);
    expect(res?.status(), `${game.id} page response`).toBe(200);
    await page.waitForLoadState("networkidle");

    // 사이드바 nav DOM 부재 — game variant 에선 미렌더
    const sidebar = page.getByRole("navigation", { name: "풀림 게임즈 메뉴" });
    await expect(
      sidebar,
      `${game.id} 사이드바가 DOM 에 있으면 chrome 정책 위반 (몰입 깨짐)`,
    ).toHaveCount(0);

    // 헤더 우측 검색·알림 placeholder 부재
    const search = page.getByRole("button", { name: /검색/ });
    await expect(
      search,
      `${game.id} 검색 placeholder 가 게임 화면에 노출됨`,
    ).toHaveCount(0);
    const bell = page.getByRole("button", { name: /알림/ });
    await expect(
      bell,
      `${game.id} 알림 placeholder 가 게임 화면에 노출됨`,
    ).toHaveCount(0);

    // 헤더 좌측 ✕ (게임 허브로 복귀) — ArrowLeft 아이콘 + aria-label
    const back = page.getByRole("link", { name: "게임 허브로 돌아가기" });
    await expect(
      back,
      `${game.id} 게임 허브 복귀 링크 (✕) 부재 — 학습자 탈출 경로 없음`,
    ).toBeVisible();

    // ✕ 클릭 시 /games 로 navigate
    await back.click();
    await page.waitForURL("**/games");
    expect(
      page.url().endsWith("/games"),
      `${game.id} ✕ 클릭 후 /games 로 안 감 — 실제: ${page.url()}`,
    ).toBe(true);
  });
}
