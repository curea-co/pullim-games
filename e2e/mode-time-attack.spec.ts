// Plan E Phase 3 — time-attack URL 진입 + 타이머 노출 검증.
// 30초 timeout 까지 실시간 카운트다운은 비현실적 e2e — timer DOM 노출 + URL 진입 정상 로드만 검증.
//
// PR #92 Codex round 5 fix:
//   - wall-clock 의존성 제거. `seconds > 0` 같은 시간 경과 단언은 CI 가 느리거나
//     브라우저 스케줄링이 밀리면 기능은 정상이어도 `0s` 로 읽혀 flaky 가 된다.
//   - e2e 에서는 `time-attack-seconds` testid 가 노출되고 `<숫자>s` 포맷이 맞는지만
//     검증하고, 실제 시간 경과 성질 (감소·만료) 은 단위 테스트로 위임
//     (src/components/game-mechanics/TimeAttackTimer.test.ts §"초 포맷").

import { test, expect } from "@playwright/test";

const SAMPLE_GAMES = [
  "math-quick-quiz",
  "english-blank",
  "english-vocab-typing",
  "english-word-match",
];

for (const gameId of SAMPLE_GAMES) {
  test(`${gameId} — ?mode=time-attack 진입 + timer 노출`, async ({ page }) => {
    const res = await page.goto(`/games/${gameId}?mode=time-attack`);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    const shell = page.getByTestId("game-shell");
    await expect(shell).toBeVisible();
    // 4 메커니즘 컴포넌트만 타이머 표시 — 12 직접 게임은 본 PR 스코프 아님.
    const timer = page.getByTestId("time-attack-timer");
    await expect(timer).toBeVisible({ timeout: 5_000 });
    // PR #92 Codex round 5 fix: wall-clock 의존성 제거 — 포맷만 검증.
    // seconds 가 0 이건 30 이건 정상 동작. 감소·만료 성질은 단위 테스트가 검증.
    const seconds = page.getByTestId("time-attack-seconds");
    await expect(seconds).toBeVisible();
    await expect(seconds).toHaveText(/^\d+s$/);
  });
}

test("time-attack default 모드 fallback (?mode=time-attack 미명시 시 timer 미노출)", async ({
  page,
}) => {
  const res = await page.goto(`/games/math-quick-quiz`);
  expect(res?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  const timer = page.getByTestId("time-attack-timer");
  await expect(timer).toHaveCount(0);
});
