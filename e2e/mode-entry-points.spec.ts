// Plan E Phase 5 — 홈/허브 mode 진입점 검증.
// 홈 페이지는 gamesPlayed === 0 시 EmptyDashboard 만 노출 (RecommendationCard 미 렌더링) — 본 케이스 e2e 비결정적.
// 본 테스트는 (1) 게임 허브 ModeChipsRow + (2) 게임 허브 RecommendationCard 상의 alt-modes +
// (3) URL 직접 진입 가드 (Codex round 4) 를 검증.
//
// PR #92 Codex round 1 fix: 비지원 게임이 추천될 수 있으므로 alt-modes 는 supportedAlts
// 결과에 따라 조건부. 본 케이스는 ModeChipsRow (default math-quick-quiz = 지원) 만
// 결정적으로 검증.
//
// PR #92 Codex round 2 fix:
//   - 44×44 터치 영역 검증: height 만 보던 것을 width 까지 함께 검증 (SPEC 08.10 정합).
//   - RecommendationCard alt-modes 회귀 보강: review-queue 는 모든 게임 지원이므로
//     nav 자체는 어떤 추천 결과에서도 반드시 렌더링되어야 한다. "nav 미렌더 시 통과"
//     분기를 제거 — 누락 시 fail.
//
// PR #92 Codex round 4 fix:
//   - 지원 게임 집합 하드코딩 제거. registry 의 manifest.meta.mechanismComponent 에서
//     도출 — drift 차단. 새 게임 추가 시 manifest 한 곳만 갱신하면 e2e 자동 반영.
//   - URL 직접 진입 가드: 4 메커니즘 미통합 게임 (factorization 등) 에
//     `?mode=time-attack` 으로 진입해도 TimeAttackTimer 가 노출되지 않아야 한다
//     (default 로 정규화 = useGameMode(gameId) 의 normalizeModeForGame).

import { test, expect } from "@playwright/test";
import { games } from "../src/lib/games/registry";

// registry 도출 — manifest.meta.mechanismComponent 단일 진실원.
const mechanismGameIds = new Set(
  games
    .filter((g) => g.meta.mechanismComponent !== undefined)
    .map((g) => g.meta.id),
);
const directGameIds = games
  .filter(
    (g) =>
      g.meta.mechanismComponent === undefined && g.meta.status === "available",
  )
  .map((g) => g.meta.id);

test("게임 허브 — ModeChipsRow 노출 (default math-quick-quiz 4 메커니즘 지원)", async ({
  page,
}) => {
  await page.goto("/games");
  await page.waitForLoadState("networkidle");

  // 1) 허브 mode chip row — defaultGameId math-quick-quiz 는 4 메커니즘 기반 → 3 chip 모두 노출
  const hubChips = page.getByTestId("hub-mode-chips");
  await expect(hubChips).toBeVisible();
  await expect(hubChips.getByText(/타임어택/)).toBeVisible();
  await expect(hubChips.getByText(/잊혀가는 카드/)).toBeVisible();
  await expect(hubChips.getByText(/오늘 카드/)).toBeVisible();
});

test("게임 허브 — ModeChipsRow 타임어택 클릭 시 ?mode=time-attack 진입", async ({
  page,
}) => {
  await page.goto("/games");
  await page.waitForLoadState("networkidle");
  const chips = page.getByTestId("hub-mode-chips");
  await expect(chips).toBeVisible();

  const taLink = chips.getByRole("link", { name: /타임어택/ });
  await taLink.click();
  await page.waitForURL(/\?mode=time-attack/);
  await expect(page).toHaveURL(/\?mode=time-attack/);
  // 진입 후 timer 노출
  const timer = page.getByTestId("time-attack-timer");
  await expect(timer).toBeVisible({ timeout: 5_000 });
});

test("게임 허브 — mode chip 은 SPEC 08.10 의 최소 터치 영역(44×44)을 만족", async ({
  page,
}) => {
  await page.goto("/games");
  await page.waitForLoadState("networkidle");
  const chips = page.getByTestId("hub-mode-chips");
  await expect(chips).toBeVisible();

  // 각 chip 의 bbox 가 44×44 이상인지 확인 (SPEC 08.10 a11y 토큰)
  // PR #92 Codex round 2 fix: 가로(width) 도 함께 검증 — height 만 보면 폭 회귀를 놓침.
  const links = chips.getByRole("link");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
});

test("게임 허브 — RecommendationCard 의 alt-modes 는 모든 추천 게임에서 review-queue 진입을 보장", async ({
  page,
}) => {
  await page.goto("/games");
  await page.waitForLoadState("networkidle");

  // PR #92 Codex round 2 fix:
  //   review-queue 는 모든 게임 지원(getAuxiliaryModesFor 의 일관 계약).
  //   따라서 추천 결과가 어떤 게임이든 alt-modes nav 는 반드시 렌더링되어야 한다.
  //   "nav 미렌더 시 조기 통과" 분기는 nav 자체가 사라지는 회귀를 가렸으므로 제거.
  const altNav = page.getByTestId("recommendation-alt-modes");
  await expect(altNav).toBeVisible({ timeout: 5_000 });

  // review-queue link 는 항상 존재해야 한다 (모든 게임 지원 계약).
  const reviewLink = altNav.locator('a[data-mode="review-queue"]');
  await expect(reviewLink).toHaveCount(1);

  // 각 link 가 (gameId, mode) 조합이 supportedModes 정합인지 검증.
  // review-queue : 모든 게임 허용.
  // time-attack / deep-recall : 4 메커니즘 게임만 허용 (비지원 게임에 노출 X = Codex round 1 fix 핵심).
  //
  // PR #92 Codex round 4 fix: mechanismGameIds 셋은 registry 에서 도출 — 하드코딩 drift 차단.
  const links = altNav.getByRole("link");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  let sawReviewQueue = false;
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const href = await link.getAttribute("href");
    expect(href).toBeTruthy();
    const match = href!.match(/\/games\/([^?]+)\?mode=([^&]+)/);
    expect(match).not.toBeNull();
    const [, gameId, mode] = match!;
    if (mode === "review-queue") {
      sawReviewQueue = true;
    }
    if (mode === "time-attack" || mode === "deep-recall") {
      // Codex round 1 fix — 비지원 게임에 노출 차단.
      expect(mechanismGameIds.has(gameId)).toBe(true);
    }

    // PR #92 Codex round 2 fix: 44×44 (height + width) 둘 다 검증.
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
  // 추가 어서션 — review-queue link 누락 회귀 명시.
  expect(sawReviewQueue).toBe(true);
});

// PR #92 Codex round 4 fix — URL 직접 진입 가드 회귀 차단.
//
// 비지원 게임 (4 메커니즘 미통합 — factorization 등) 에 `?mode=time-attack` 으로 직접
// URL 진입해도 TimeAttackTimer 가 렌더되지 않아야 한다. useGameMode(gameId) 가
// normalizeModeForGame 으로 default 정규화하므로 time-attack 전용 testid 가 부재.
test("URL 직접 진입 가드 — 비지원 게임 ?mode=time-attack 진입 시 TimeAttackTimer 미노출 (default 로 정규화)", async ({
  page,
}) => {
  // 직접 게임 중 첫 번째 'available' 샘플로 검증 (registry 도출 — 하드코딩 X).
  const sample = directGameIds[0];
  expect(sample).toBeTruthy();
  if (!sample) return;

  await page.goto(`/games/${sample}?mode=time-attack`);
  await page.waitForLoadState("networkidle");

  // TimeAttackTimer 는 4 메커니즘 컴포넌트 안에서만 렌더. 직접 게임은 어떤 mode 진입이든
  // 본 timer testid 가 부재해야 한다 (default 처럼 동작 = 정규화 성공).
  const timer = page.getByTestId("time-attack-timer");
  await expect(timer).toHaveCount(0);
});

test("URL 직접 진입 가드 — 비지원 게임 ?mode=deep-recall 진입 시 DeepRecallEmpty 미노출 (default 로 정규화)", async ({
  page,
}) => {
  const sample = directGameIds[0];
  expect(sample).toBeTruthy();
  if (!sample) return;

  await page.goto(`/games/${sample}?mode=deep-recall`);
  await page.waitForLoadState("networkidle");

  // DeepRecallEmpty 는 4 메커니즘 컴포넌트 안에서만 렌더. 직접 게임은 default 진입과
  // 동일하게 게임 본 화면이 나와야 한다.
  const empty = page.getByTestId("deep-recall-empty");
  await expect(empty).toHaveCount(0);
});
