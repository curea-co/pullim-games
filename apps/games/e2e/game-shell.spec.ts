// GameShell layout 정책 자동 검증.
// `proc/plan/2026-05-13_daily-execution.md` 트랙 D + `2026-05-12_game-detail-single-column.md` D1=B / D2=A 정책 회귀 게이트.
//
// 검증:
// - variant 별 data-variant attribute 일치
// - lg+ 에서 max-w 정책 (split=640, stack=480, match=720)
// - content section overflow-y=auto (자체 스크롤 정책)
// - cta section 존재 (viewport-in 자체는 viewport.spec 가 검증)

import { test, expect } from "@playwright/test";

interface VariantCase {
  gameId: string;
  variant: "split" | "stack" | "match";
  /** lg viewport (≥1024) 에서 main 의 max-width px. */
  lgMaxW: number;
}

const CASES: VariantCase[] = [
  { gameId: "chemistry-balance", variant: "split", lgMaxW: 640 },
  { gameId: "factorization", variant: "stack", lgMaxW: 480 },
  { gameId: "english-word-match", variant: "match", lgMaxW: 720 },
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

for (const c of CASES) {
  for (const vp of VIEWPORTS) {
    test(`${c.gameId} @ ${vp.name} — variant=${c.variant}, layout 정책`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto(`/games/${c.gameId}`);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState("networkidle");

      const shell = page.getByTestId("game-shell");
      await expect(shell).toBeVisible();

      // 1) data-variant attribute
      await expect(shell).toHaveAttribute("data-variant", c.variant);

      // 2) lg+ 에서 max-w 정책
      if (vp.width >= 1024) {
        const shellBox = await shell.boundingBox();
        expect(shellBox).not.toBeNull();
        // main 은 mx-auto + max-w 라 actual width 는 px-6 padding 포함해서 정확히 max-w. tailwind 의 max-w-[640px] 는 inline style.
        // px-6 = 24px*2 = 48px padding 포함되어 max-w 까지 도달 가능. boundingBox.width ≤ max-w.
        expect(
          shellBox!.width,
          `${c.gameId} lg+ main width ≤ ${c.lgMaxW}`,
        ).toBeLessThanOrEqual(c.lgMaxW);
      }

      // 3) content section overflow-y=auto
      const content = page.getByTestId("game-shell-content");
      await expect(content).toBeVisible();
      const overflowY = await content.evaluate(
        (el) => window.getComputedStyle(el).overflowY,
      );
      expect(overflowY, `${c.gameId} content overflow-y`).toBe("auto");

      // 4) cta footer 존재
      const cta = page.getByTestId("game-shell-cta");
      await expect(cta).toBeVisible();
    });
  }
}
