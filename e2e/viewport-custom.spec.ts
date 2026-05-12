// custom-* 4 게임 viewport visibility — `proc/plan/2026-05-12_daily-outcome-cleanup.md` §2.2.
//
// official 10 게임은 viewport.spec.ts 에서 처리. 본 spec 은 콘텐츠가 사용자 localStorage 의존인
// 4 custom 게임만 — beforeEach 로 seed 주입 후 official 과 동일 매트릭스 (6 viewport) 검증.
//
// 6 viewport × 4 게임 = 24 케이스 (60 + 24 = 84 total).

import { test, expect } from "@playwright/test";
import { CUSTOM_GAMES } from "./helpers/games";
import { VIEWPORTS } from "./helpers/viewports";
import { seedCustomGames } from "./helpers/seed";

for (const game of CUSTOM_GAMES) {
  for (const vp of VIEWPORTS) {
    const label = vp.strictCta ? "strict" : "loose";
    test(`${game.id} @ ${vp.name} (${vp.width}x${vp.height}, ${label}) — page 200, CTA, no errors`, async ({
      page,
    }) => {
      await seedCustomGames(page);

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto(`/games/${game.id}`);
      expect(res?.status(), `${game.id} page response`).toBe(200);

      await page.waitForLoadState("networkidle");

      const cta = page.getByRole("button", { name: game.ctaTextPattern }).first();
      await expect(cta, `${game.id} CTA exists`).toBeVisible();

      if (vp.strictCta) {
        const box = await cta.boundingBox();
        expect(box, `${game.id} CTA boundingBox`).not.toBeNull();
        expect(
          box!.y + box!.height,
          `${game.id} CTA bottom ≤ viewport.height(${vp.height}) — 실제: y=${box!.y}, h=${box!.height}`,
        ).toBeLessThanOrEqual(vp.height);
      }

      expect(
        consoleErrors,
        `${game.id} console errors: ${consoleErrors.join(" / ")}`,
      ).toEqual([]);
    });
  }
}
