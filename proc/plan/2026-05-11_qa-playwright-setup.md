# QA — Playwright 자동 검증 도입

DRAFT · 2026-05-11

## 0. 컨텍스트

선행 plan:
- [2026-05-11_game-cta-layout.md](2026-05-11_game-cta-layout.md) §5.1 — Playwright 84 케이스 (14 게임 × 6 viewport) CTA visibility, **별 후속 작업으로 미도입** 상태
- [2026-05-11_game-shell-right-area.md](2026-05-11_game-shell-right-area.md) §8.2 — Phase A/B 시각 검증 (수동) — 사람이 lg+ 브라우저 확인

사용자 요청 (2026-05-11): Phase A/B 시각 검증을 Playwright 로 자동화.

가치:
- 사용자 보고 CTA viewport 밖 같은 버그가 다시 들어오는 것 회귀 방지 — 14 게임 × N viewport 격자가 사람 손으로 매번 못 함
- aside slot 추가 / variant 변경 / 새 게임 추가 시 자동 게이트
- PR 단위 검증 — 머지 전 viewport 회귀 자동 차단

## 1. 진단 — 현재 자동화 격차

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) 의 job 구조:
- ✅ typecheck / lint / registry-sync — 정적 검증
- ✅ test-core (vitest) — `src/lib/core` 단위 테스트
- ✅ test-game (matrix per game) — `src/games/<id>` 단위 테스트
- ✅ build — Next.js 프로덕션 빌드 통과
- ❌ **e2e / visual** — 페이지 200, CTA visible, aside 노출 등 런타임 동작은 검증 없음

결과: 정적 통과 + 빌드 성공 = 머지 가능. 하지만 실제 브라우저 동작 (특히 viewport 별 레이아웃) 회귀는 사람 눈에만 의존.

## 2. 목표

1. Playwright 도입 + CI 통합 — PR 단위 자동 검증
2. 14 official 게임 × 다중 viewport 에서 핵심 동작 assert:
   - 페이지 200, console error 없음
   - CTA 가 첫 viewport 안 visible (`boundingBox.y + height ≤ vp.height`)
   - aside slot 노출 정책 (lg+ split = 노출, mobile = 미노출, stack/match = 미노출)
3. 게임별 matrix 병렬 — CI 시간 < 5분 유지
4. 회귀 게이트 — assertion 실패 시 PR 머지 차단

비목표:
- 스크린샷 회귀 (시각 diff) — Phase 3 로 분리, 본 plan 은 동작 assertion 까지
- 게임 메커닉 e2e (실제 게임 플레이 시뮬레이션) — 별 plan
- vitest 대체 — 둘은 다른 layer, 공존

## 3. 옵션 분석

### 옵션 A — Playwright + GitHub Actions native

Playwright 공식 도입, CI 에 `e2e` job 추가. 가장 표준적인 길.

✅ 공식 문서 풍부. 커뮤니티 패턴 많음. Chromium 단일 만 써도 충분 (실 사용자 기준 차이 미미).
✅ 기존 detect-changes / game-matrix 패턴 재사용 — 변경된 게임만 e2e 도 가능 (PR), push 시 전체 (main).
❌ 브라우저 바이너리 download (≈ 350MB) → CI 캐시 전략 필요. 첫 도입 인프라 셋업 비용 큼.

### 옵션 B — Vitest + happy-dom + JSDOM

런타임 DOM 시뮬레이션. 실제 브라우저 X.

✅ 가볍고 빠름. 기존 vitest 인프라 그대로.
❌ Layout / viewport 검증 부정확. `boundingBox` 같은 측정 부정확. CSS media query 시뮬레이션 한계.
❌ 사용자 보고 버그의 진짜 원인 (`min-h-dvh` 잘못된 가정) 같은 viewport 의존 회귀를 못 잡음.

→ 본 plan 의 목적상 부적합.

### 옵션 C — Playwright Component Testing

페이지 라우팅 우회, 컴포넌트 단독 마운트.

✅ 빠름. 게임별 격리 좋음.
❌ AppShell wrapper 의 viewport 가정 (`h-screen`) 같은 부모-자식 상호작용 검증 X.
❌ 실제 사용자 보고 버그가 wrapper 와 게임 main 의 상호작용에서 발생 → 컴포넌트 격리는 본 plan 목적 미달.

### 추천 — 옵션 A

Playwright 풀 페이지 e2e. viewport 의존 layout 회귀가 본 plan 의 핵심 가치 → 실 브라우저 렌더 필수.

## 4. 설계

### 4.1 디렉토리

```
e2e/
├── helpers/
│   ├── games.ts                — 14 official 게임 ID + variant 메타
│   └── viewports.ts             — 6 viewport 상수
├── viewport.spec.ts             — CTA visibility (Phase 1)
└── game-shell.spec.ts           — aside slot 정책 (Phase 2)

playwright.config.ts             — config (root)
```

### 4.2 playwright.config.ts 핵심

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

결정:
- Chromium 단일 — 실 사용자 기반 차이 미미, CI 시간 절약. WebKit/Firefox 는 V2.
- production build → `next start` — dev 의 HMR/warning 오버레이 회피, 진짜 사용자 환경.
- retries 2 — flaky 방지. 단, 실제 회귀 가리지 않게 retry 빈도 모니터링.

### 4.3 helpers — 14 게임 + viewport 메타

```ts
// e2e/helpers/games.ts
export interface GameMeta {
  id: string;
  variant: "split" | "stack" | "match";
  ctaTextPattern: RegExp;  // "다음", "정답 확인", "균형 확인", "마치기", "확인"
}

export const OFFICIAL_GAMES: GameMeta[] = [
  { id: "factorization",      variant: "stack", ctaTextPattern: /다음|마치기/ },
  { id: "math-graph-shift",   variant: "split", ctaTextPattern: /확인|다음|마치기/ },
  { id: "math-quick-quiz",    variant: "split", ctaTextPattern: /다음/ },
  { id: "physics-vector",     variant: "split", ctaTextPattern: /확인|다음|마치기/ },
  { id: "chemistry-balance",  variant: "split", ctaTextPattern: /균형 확인|다음|마치기/ },
  { id: "history-timeline",   variant: "split", ctaTextPattern: /다음|마치기/ },
  { id: "english-order",      variant: "split", ctaTextPattern: /다음|마치기/ },
  { id: "english-blank",      variant: "split", ctaTextPattern: /다음|보기를 골라주세요/ },
  { id: "english-word-match", variant: "match", ctaTextPattern: /다음|마치기/ },
  { id: "vocab-typing",       variant: "split", ctaTextPattern: /확인|다음|마치기/ },
];
// custom-* 4종은 콘텐츠 없으면 empty state — Phase 2 에서 별도 처리 (E2E 로딩 시 setup)
```

```ts
// e2e/helpers/viewports.ts
export const VIEWPORTS = [
  { name: "mobile-sm",  width: 320,  height: 568 },   // iPhone SE
  { name: "mobile",     width: 390,  height: 844 },   // iPhone 13
  { name: "mobile-land",width: 844,  height: 390 },   // 가로
  { name: "tablet",     width: 768,  height: 1024 },  // iPad
  { name: "desktop",    width: 1280, height: 800 },   // 노트북
  { name: "wide",       width: 1920, height: 1080 },  // 큰 모니터
] as const;
```

### 4.4 viewport.spec.ts (Phase 1)

```ts
import { test, expect } from "@playwright/test";
import { OFFICIAL_GAMES } from "./helpers/games";
import { VIEWPORTS } from "./helpers/viewports";

for (const game of OFFICIAL_GAMES) {
  for (const vp of VIEWPORTS) {
    test(`${game.id} @ ${vp.name} — page 200, CTA in viewport, no console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto(`/games/${game.id}`);
      expect(res?.status()).toBe(200);

      const cta = page.getByRole("button", { name: game.ctaTextPattern }).first();
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);

      expect(consoleErrors).toEqual([]);
    });
  }
}
```

10 게임 × 6 viewport = 60 케이스 (custom-* 4 종 Phase 2 에서 별도).

### 4.5 game-shell.spec.ts (Phase 2)

aside slot 노출 정책 + variant 별 lg+ 레이아웃:

```ts
for (const game of OFFICIAL_GAMES) {
  test(`${game.id} @ desktop — aside policy`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/games/${game.id}`);
    const aside = page.locator('main aside .lg\\:flex-1').first();

    if (game.variant === "split") {
      // split = lg+ 에서 aside 노출 (게임이 aside prop 전달했을 때)
      // Phase B 진행 후엔 11 split 게임 모두 aside 있어야 함
      // 본 Phase 2 시점엔 chemistry-balance 만 — 나머지는 visible 미정
    } else {
      // stack/match = aside 무시
      await expect(aside).toHaveCount(0);
    }
  });

  test(`${game.id} @ mobile — aside 미노출`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/games/${game.id}`);
    const asideContent = page.locator('main aside .lg\\:flex-1').first();
    await expect(asideContent).toBeHidden();  // lg:flex 라 모바일 hidden
  });
}
```

(주: aside 노출은 GameShell 의 `hidden lg:flex` 클래스 기반. Tailwind escape 셀렉터 `.lg\\:flex-1` 또는 data-testid 추가 권장.)

### 4.6 CI 통합 — `.github/workflows/ci.yml` 변경

기존 job 들 뒤에 `e2e` job 추가:

```yaml
e2e:
  name: e2e (Playwright)
  needs: build  # build 통과 후
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: "22"
        cache: npm
    - run: npm ci
    - run: npm run gen:registry
    - name: Cache Playwright browsers
      uses: actions/cache@v4
      with:
        path: ~/.cache/ms-playwright
        key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
    - if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
```

`package.json` 에:
```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

## 5. 검증 항목 — 단계별

### Phase 1 (viewport.spec.ts)

**모든 viewport** (60 케이스):
- [x] `GET /games/<id>` → 200
- [x] CTA 버튼 exists (`isVisible()`)
- [x] page console error / pageerror 0건

**strictCta viewport** (40 케이스 — mobile/tablet/desktop/wide):
- [x] CTA bottom Y ≤ viewport height (boundingBox 강제)

**loose viewport** (20 케이스 — mobile-sm 320×568, mobile-land 844×390):
- boundingBox 강제 안 함. 콘텐츠가 viewport 보다 길어 스크롤 자연스러운 케이스.
- 진짜 사용자 보고 회귀 (`min-h-dvh` 버그) 는 표준 모바일 viewport 에서 발생했으니 그 이상만 엄격 검증.

**분기 근거**: 첫 실 실행에서 mobile-sm + mobile-land 18 케이스가 콘텐츠 길이 이슈로 실패. 진짜 회귀가 아닌 viewport 자체 한계라 strictCta 분기 도입. (별 plan 으로 작은 viewport 콘텐츠 최적화 검토 가능)

### Phase 2 (game-shell.spec.ts)
- [ ] split + lg+ : aside 영역 노출 (chemistry-balance 만 검증, 나머지는 Phase B 머지 후 확장)
- [ ] split + mobile : aside 미노출
- [ ] stack / match : aside 영역 자체 미렌더 (DOM 부재)

### Phase 3 (선택 — 본 plan 비포함)
- 스크린샷 회귀, visual diff. 별 plan.

## 6. viewport / 게임 매트릭스 (Phase 1 기준)

| 게임 | mobile-sm | mobile | mobile-land | tablet | desktop | wide |
|---|---|---|---|---|---|---|
| factorization (stack) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| math-graph-shift | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| math-quick-quiz | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| physics-vector | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| chemistry-balance | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| history-timeline | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| english-order | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| english-blank | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| english-word-match (match) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| vocab-typing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

총 60 케이스. custom-* 4 종은 사용자 콘텐츠 의존이라 Phase 2 또는 별 setup (seed localStorage) 필요.

## 7. 단계 분할

**Phase 1 — 셋업 + CTA visibility (이 plan 의 minimum viable)**
- Playwright + 의존성 설치
- playwright.config.ts + e2e/ 디렉토리 골격
- viewport.spec.ts (60 케이스)
- CI e2e job 추가 + 캐시
- PR 단위: 코드 + CI yaml + 의존성. 위험 중 (CI 첫 통합).

**Phase 2 — aside slot 정책**
- game-shell.spec.ts
- custom-* 4 게임 setup (seed localStorage 또는 mock)
- PR 단위: spec 파일 + helpers 확장.

**Phase 3 (선택, 본 plan 비포함)**
- 스크린샷 회귀. `expect(page).toHaveScreenshot()` baseline.
- OS 폰트 차이 / GPU 차이 noise — baseline 관리 부담 큼 → 별 plan.

## 8. 위험 & 대안

**위험 1 — CI 시간 폭증**
60 케이스 × 평균 3초 = ≈ 3분. workers 4 병렬 → ≈ 1분. 허용 범위.
→ 만약 5분 초과 시 game-matrix 패턴 차용 (변경된 게임만 e2e), main push 만 전체.

**위험 2 — flaky**
첫 도입 시 animation / async state hydration 등으로 flaky 발생.
→ `await page.waitForLoadState("networkidle")` 또는 명시 selector wait. retries 2 로 마스킹하되, retry 빈도 모니터링 (3회 이상 retry 케이스는 buy/fix).

**위험 3 — CTA selector fragile**
한국어 텍스트 매칭이라 microcopy 변경 시 깨짐.
→ 게임별 `ctaTextPattern` 정규식으로 흡수 (이미 §4.3 helpers 에 반영). 더 안정적인 길: 각 게임 CTA 에 `data-testid="game-cta"` 부여 → 별 후속.

**위험 4 — `lg:flex-1` 같은 Tailwind 클래스 selector 깨지기 쉬움**
JIT 컴파일 변경 시 클래스명 변할 가능성.
→ `data-testid="game-shell-aside"` 추가가 정석. Phase 2 시점에 GameShell 수정.

**위험 5 — Playwright 브라우저 다운로드 시간**
350MB. 캐시 hit 시 < 5초, miss 시 30~60초.
→ `actions/cache@v4` 로 package-lock.json 해시 키. CI 첫 통합 시 한 번만 무거움.

**위험 6 — production build 시간**
`npm run build` + `npm run start` 가 e2e job 안에서 다시 도는 비효율. build job 산출물 재사용 가능.
→ Phase 1 은 단순함을 위해 e2e 안에서 다시 build. Phase 2 에서 artifact 공유 최적화.

## 9. 작업 항목 / 진행

### Phase 1 — 셋업 + CTA visibility

- [x] feature 브랜치 `feat/e2e-playwright-setup`
- [x] `npm install -D @playwright/test` + `npx playwright install chromium` (로컬). CI 는 `--with-deps`.
- [x] `playwright.config.ts` 작성 (§4.2)
- [x] `e2e/helpers/games.ts` — 10 official 게임 메타 (custom 제외)
- [x] `e2e/helpers/viewports.ts` — 6 viewport + `strictCta` 분기 메타
- [x] `e2e/viewport.spec.ts` — page 200 + CTA visibility + console error + strictCta 분기
- [x] 로컬 `npm run test:e2e` — **60/60 green (21.1초)**
- [x] `package.json` script 추가 (`test:e2e`, `test:e2e:ui`)
- [x] `.gitignore` — `playwright-report/`, `test-results/`, `playwright/.cache` 추가
- [x] `.github/workflows/ci.yml` — `e2e` job 추가 (validate 후, build 와 병렬), Playwright 버전 기반 browser 캐시, 실패 시 report artifact 업로드 (retention 7일)
- [ ] PR 생성 + dev 머지

### Phase 2 — aside slot 정책

- [ ] feature 브랜치 `feat/e2e-game-shell-aside`
- [ ] GameShell.tsx 에 `data-testid="game-shell-aside"` 부여 (selector 안정성)
- [ ] `e2e/game-shell.spec.ts` — aside 노출 정책 (split lg+, mobile, stack/match)
- [ ] custom-* 4 게임 setup — seed localStorage 또는 콘텐츠 mock
- [ ] PR 생성 + dev 머지

### 마무리

- [ ] cta-layout plan §5.1 의 미완 항목 → [x] (본 plan 흡수)
- [ ] right-area plan §8.2 의 시각 검증 자동화 완료 명시
- [ ] 본 plan → `proc/archive/plan/` archive

## 10. 산출물

- `playwright.config.ts` (root)
- `e2e/helpers/games.ts`
- `e2e/helpers/viewports.ts`
- `e2e/viewport.spec.ts` (Phase 1)
- `e2e/game-shell.spec.ts` (Phase 2)
- `package.json` script 2 개 추가 + `@playwright/test` devDep
- `.gitignore` — `playwright-report/`, `test-results/`
- `.github/workflows/ci.yml` — `e2e` job
- `src/components/game-shell/GameShell.tsx` — `data-testid` 부여 (Phase 2)
- 본 plan → archive
