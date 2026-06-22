// Plan E Phase 5 — 홈/허브 mode 진입점 검증.
// 본 테스트는 (1) 게임 허브 ModeChipsRow + (2) 게임 허브 RecommendationCard 상의 alt-modes +
// (3) URL 직접 진입 가드 (Codex round 4) + (4) 홈 RecommendationCard 의 alt-modes
// (Codex round 5) 를 검증.
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
//
// PR #92 Codex round 5 fix:
//   - 홈 (`/`) 의 RecommendationCard alt-modes 회귀 차단. 홈은 gamesPlayed > 0 게이트
//     뒤에서만 RecommendationCard 가 렌더되므로 SRS 상태를 시드해서 dashboard 경로로
//     진입한 뒤 alt-modes nav · chip URL · 비지원 시 미노출을 직접 검증.
//   - 허브만 보는 것은 홈 회귀를 놓친다.
//
// PR #92 Codex round 6 fix:
//   - SPEC 08.10 focus ring 회귀 차단. chip 에 키보드 Tab 으로 진입한 뒤
//     `:focus-visible` 상태에서 outline-width = 2px, outline-color = #0362DA
//     (accent-positive) 가 적용되는지를 직접 검증.
//   - 두 진입점 (허브 ModeChipsRow + 홈 RecommendationCard alt-modes) 양쪽 확인.

import { test, expect, type Page } from "@playwright/test";
import { games } from "../lib/games/registry";

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

// PR #92 Codex round 5 fix — 홈 (`/`) RecommendationCard 진입점 회귀 차단.
//
// 홈은 gamesPlayed > 0 일 때만 Dashboard 가 렌더되며 그 안에서 RecommendationCard
// (alt-modes 포함) 가 노출된다. SRS 카드 1개를 시드해 dashboard 경로로 진입한 뒤
// 홈에서도 (1) alt-modes nav (2) chip URL (3) 비지원 모드 미노출 계약을 검증.
//
// 시드 방법: localStorage 의 `pullim-games:srs:<gameId>:<cardId>` 키에 SerializedState
// (`reviewCount > 0`) 직접 주입 — `src/lib/core/storage/srs.ts` 의 serialize 와 동일 포맷.
// 실 게임 1판 자동화보다 결정적 + 빠름.

interface SerializedSrsState {
  fsrsCard: {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number;
    last_review: string | null;
    learning_steps: number;
  };
  reviewCount: number;
  lastReviewAt: string | null;
}

/** 메커니즘 게임의 카드 1장에 reviewed=true 시드.
 *  → gamesPlayed=1 → home 이 Dashboard + RecommendationCard 를 렌더.
 *  → recommendation 알고리즘은 lowestR>=0.85 일 때 default 로 fallback하며
 *    lowestGameId 가 시드된 게임. 시드 게임을 메커니즘 게임으로 두면
 *    alt-modes 가 3개 모두 노출되어 검증 범위가 최대화된다. */
async function seedReviewedCard(
  page: Page,
  gameId: string,
  cardId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const state: SerializedSrsState = {
    fsrsCard: {
      due,
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      state: 2,
      last_review: now,
      learning_steps: 0,
    },
    reviewCount: 1,
    lastReviewAt: now,
  };
  await page.addInitScript(
    ({ key, value }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // localStorage 거부 환경은 e2e 대상 아님
      }
    },
    {
      key: `pullim-games:srs:${gameId}:${cardId}`,
      value: JSON.stringify(state),
    },
  );
}

test("홈 (`/`) — gamesPlayed>0 일 때 RecommendationCard alt-modes nav 노출 (메커니즘 게임 시드)", async ({
  page,
}) => {
  // 시드 게임 = 메커니즘 게임 (alt-modes 3개 모두 지원). registry 에서 첫 메커니즘
  // 게임을 도출 — 하드코딩 X.
  const seedGameId = [...mechanismGameIds][0];
  expect(seedGameId).toBeTruthy();
  if (!seedGameId) return;

  await seedReviewedCard(page, seedGameId, "seed-card-1");
  await page.goto("/home");
  await page.waitForLoadState("networkidle");

  // Dashboard 경로 진입 — RecommendationCard 가 등장해야 한다.
  // 시드 카드가 due 24h 이내라 R>=0.85 → default fallback, lowestGameId=seedGameId
  // (메커니즘 게임) → alt-modes nav 노출 + 3 chip 모두 등장 예상.
  const altNav = page.getByTestId("recommendation-alt-modes");
  await expect(altNav).toBeVisible({ timeout: 5_000 });
});

test("홈 (`/`) — RecommendationCard alt-modes chip 클릭 시 정확한 URL 진입", async ({
  page,
}) => {
  const seedGameId = [...mechanismGameIds][0];
  expect(seedGameId).toBeTruthy();
  if (!seedGameId) return;

  await seedReviewedCard(page, seedGameId, "seed-card-1");
  await page.goto("/home");
  await page.waitForLoadState("networkidle");

  const altNav = page.getByTestId("recommendation-alt-modes");
  await expect(altNav).toBeVisible({ timeout: 5_000 });

  // review-queue link (모든 게임 지원 — 가장 안정적 검증 대상) 의 href 검증 + 클릭.
  const reviewLink = altNav.locator('a[data-mode="review-queue"]');
  await expect(reviewLink).toHaveCount(1);
  const href = await reviewLink.getAttribute("href");
  expect(href).toBe(`/games/${seedGameId}?mode=review-queue`);

  await reviewLink.click();
  await page.waitForURL(/\?mode=review-queue/);
  await expect(page).toHaveURL(
    new RegExp(`/games/${seedGameId}\\?mode=review-queue`),
  );
});

test("홈 (`/`) — RecommendationCard alt-modes 의 모든 chip 이 (gameId, mode) supportedModes 정합", async ({
  page,
}) => {
  // PR #92 Codex round 1 fix 와 동일 계약을 홈에서도 검증.
  // recommendation 이 어느 게임이든 다음을 보장:
  //   - review-queue : 항상 등장 (모든 게임 지원)
  //   - time-attack / deep-recall : 메커니즘 게임에서만 등장 (비지원 노출 차단)
  //   - 모든 chip 44×44 만족
  const seedGameId = [...mechanismGameIds][0];
  expect(seedGameId).toBeTruthy();
  if (!seedGameId) return;

  await seedReviewedCard(page, seedGameId, "seed-card-1");
  await page.goto("/home");
  await page.waitForLoadState("networkidle");

  const altNav = page.getByTestId("recommendation-alt-modes");
  await expect(altNav).toBeVisible({ timeout: 5_000 });

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
    if (mode === "review-queue") sawReviewQueue = true;
    if (mode === "time-attack" || mode === "deep-recall") {
      // 비지원 게임 노출 차단 (Codex round 1 fix 의 홈 버전).
      expect(mechanismGameIds.has(gameId)).toBe(true);
    }
    // 44×44 (height + width) 둘 다 검증 (SPEC 08.10).
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
  expect(sawReviewQueue).toBe(true);
});

// PR #92 Codex round 6 fix — SPEC 08.10 focus ring 회귀 차단.
//
// `:focus-visible` 상태에서 outline-width 가 2px 이상이고 outline-color 가
// accent-positive (#0362DA) 인지 확인. 전역 globals.css 의 :focus-visible 룰 + chip
// 클래스의 명시적 focus-visible:outline-* 토큰이 둘 다 적용되도록 박혔는지 검증.
//
// `keyboard.press("Tab")` 으로 첫 chip 에 포커스가 갈 때까지 진행한 뒤
// computed outlineWidth/outlineColor 를 확인.
async function assertFocusRing(page: Page, locator: ReturnType<Page["locator"]>) {
  await locator.first().focus();
  // SPEC 08.10: outline 2px solid #0362DA; outline-offset 2px.
  const style = await locator.first().evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      outlineColor: cs.outlineColor,
      outlineOffset: cs.outlineOffset,
    };
  });
  // 2px 이상 (브라우저별 px 정밀 표기 차 허용).
  const widthPx = Number.parseFloat(style.outlineWidth);
  expect(Number.isFinite(widthPx)).toBe(true);
  expect(widthPx).toBeGreaterThanOrEqual(2);
  // accent-positive #0362DA = rgb(3, 98, 218).
  expect(style.outlineColor).toMatch(/rgba?\(\s*3\s*,\s*98\s*,\s*218/);
  expect(style.outlineStyle).not.toBe("none");
}

test("게임 허브 — ModeChipsRow chip 키보드 포커스 시 SPEC 08.10 focus ring 적용", async ({
  page,
}) => {
  await page.goto("/games");
  await page.waitForLoadState("networkidle");
  const chips = page.getByTestId("hub-mode-chips");
  await expect(chips).toBeVisible();
  const links = chips.getByRole("link");
  await expect(links.first()).toBeVisible();
  await assertFocusRing(page, links);
});

test("홈 (`/`) — RecommendationCard alt-modes chip 키보드 포커스 시 SPEC 08.10 focus ring 적용", async ({
  page,
}) => {
  const seedGameId = [...mechanismGameIds][0];
  expect(seedGameId).toBeTruthy();
  if (!seedGameId) return;

  await seedReviewedCard(page, seedGameId, "seed-card-1");
  await page.goto("/home");
  await page.waitForLoadState("networkidle");

  const altNav = page.getByTestId("recommendation-alt-modes");
  await expect(altNav).toBeVisible({ timeout: 5_000 });
  const links = altNav.getByRole("link");
  await expect(links.first()).toBeVisible();
  await assertFocusRing(page, links);
});
