// CTA viewport visibility — `proc/plan/2026-05-11_qa-playwright-setup.md` §4.4.
//
// 검증 분기 (plan §5.1 옵션 A):
// - 모든 viewport : /games/<id> 200 + CTA exists + 콘솔 에러 0
// - strictCta viewport : 추가로 CTA boundingBox 가 viewport 안에 들어와야 함
//
// 회귀 차단 목적: PR #11 에서 고쳐진 `min-h-dvh` 버그 같은 viewport 의존 회귀를 자동 감지.
// 작은 viewport (mobile-sm, mobile-land) 는 콘텐츠가 자연스럽게 viewport 보다 큰 케이스
// (스크롤 가능) 라 boundingBox 강제 X. plan §5.1 표 참조.

import { test, expect } from "@playwright/test";
import { OFFICIAL_GAMES } from "./helpers/games";
import { VIEWPORTS } from "./helpers/viewports";

for (const game of OFFICIAL_GAMES) {
  for (const vp of VIEWPORTS) {
    const label = vp.strictCta ? "strict" : "loose";
    test(`${game.id} @ ${vp.name} (${vp.width}x${vp.height}, ${label}) — page 200, CTA, no errors`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto(`/games/${game.id}`);
      expect(res?.status(), `${game.id} page response`).toBe(200);

      // 게임 hydration 대기 — 첫 카드 + CTA 렌더 보장
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
