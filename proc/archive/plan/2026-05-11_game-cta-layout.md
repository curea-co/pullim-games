# 게임 화면 — CTA 가시성 + 와이드 스크린 좌우 분할

DRAFT · 2026-05-11

## 0. 컨텍스트

사용자 보고 (2026-05-11):
> Playwright 로 개발된 게임 화면에 진입하면 CTA 버튼이 화면 밖(아래)에 위치해있어.

사용자 후속 제안:
> 문제 영역이랑 CTA 영역을 좌우로 나누는 접근. 모바일에서만 횡 형태, 와이드 스크린에서는 좌우 영역을 활용.

두 사안 통합:
1. **모바일 viewport 안에 CTA anchor** (긴급 버그 fix)
2. **와이드 스크린에서 좌우 분할 레이아웃** (디자인 개선)

영향 범위: 14개 official 게임. 변경 범위 큼 → 공통 wrapper (`GameShell`) 도입 타이밍.

## 1. 진단 — 현재 구조의 두 가지 문제

### 1.1 모바일 — CTA viewport 밖

[`AppShell`](src/components/shell/app-shell.tsx) 이 viewport 컨테이너 (`h-screen flex flex-col`). 그 안 본문 영역 = `flex-1 overflow-y-auto`.

각 게임 컴포넌트 ([factorization Component.tsx:170](src/games/factorization/Component.tsx#L170) 외 13개 동일 패턴):
```tsx
<main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 py-8">
  <header />                              ← 진행도
  <section className="flex flex-1" />     ← 게임 콘텐츠
  <footer className="mt-8" />             ← CTA
</main>
```

**문제**: `min-h-dvh` (100% dynamic viewport) 가 잘못된 가정.
- AppShell wrapper 안이라 사용 가능 세로 ≈ `100dvh − header(56) − breadcrumb(36) = 100dvh − 92px`
- 게임 main 이 100dvh 차지 → 부모 스크롤 영역 `92 + 100dvh = 100dvh + 92px`
- footer 가 항상 viewport 밖 92px ↓

iPhone 13 (390×844) 기준 footer 시작 y ≈ 752 + α → 첫 화면 미노출.

### 1.2 데스크탑 — 좌우 공백 낭비

모든 게임이 `max-w-[480px]` 강제. 1280px 콘텐츠 영역에서 좌우 각 400px 공백 → 시각적 낭비. CTA 가 본문 직후 작게 떠 있음.

## 2. 목표

1. 모든 게임에서 CTA 가 첫 viewport 안 visible (320×568 ~ 1920×1080).
2. 와이드 스크린 (lg+) 에서 게임 콘텐츠와 CTA 가 좌우 분할 → 공간 활용 + 시각적 hierarchy.
3. 모바일 (md 이하) 에서는 기존 세로 stack 유지 — 풀림 6 원칙 중 "모바일 우선" 보존.
4. 14 게임 일괄 적용 가능한 공통 추상 (`GameShell`) 도입.

비목표:
- 게임 내부 메커닉 변경 (블록 드래그 방향, 매칭 방식 등 그대로)
- 헤더·breadcrumb 등 AppShell 레이아웃 변경

## 3. 설계 — GameShell wrapper + 메커닉별 변형

### 3.1 GameShell 인터페이스

`src/components/game-shell/GameShell.tsx` (신규):

```tsx
interface GameShellProps {
  /** 상단 — 진행도 + 메뉴 (모든 게임 공통) */
  header: ReactNode;

  /** 중앙 — 게임 메커닉 본체 (블록·캔버스·문제·보기 등) */
  content: ReactNode;

  /** 하단 / 우측 — CTA + 부가 정보 (힌트, 단계, 종료 등 선택) */
  cta: ReactNode;

  /**
   * 레이아웃 변형:
   * - "split"  (기본) : 모바일 세로 stack / lg+ 좌우 분할
   * - "stack"          : 항상 세로 (factorization 처럼 세로 드래그 메커닉)
   * - "match"          : 매칭 메커닉 — 좌우 분할 비활성, lg+ 에서도 가운데 단일 col
   */
  variant?: "split" | "stack" | "match";

  /** 좌우 분할 시 콘텐츠 영역 비율 — 기본 "3fr 2fr" */
  splitRatio?: string;

  /** 접근성용 sr-only 안내 */
  liveRegion?: ReactNode;
}
```

레이아웃 동작:

**variant="split"** (기본 — 다수 게임):
- 모바일 (~md): `<main flex flex-col min-h-full px-6 py-6>` → header / content / cta 세로
- lg+: `<main grid grid-cols-[3fr_2fr] gap-8 max-w-[960px]>` → 좌(content) / 우(header+cta)

**variant="stack"** (factorization 등):
- 모든 viewport 세로. content 의 메커닉(세로 드래그) 보존.

**variant="match"** (english-word-match 등):
- 모든 viewport 세로. lg+ 에서는 max-w 키워서 (예: 720px) 좌우 매칭 보드가 더 넓게.

### 3.2 메커닉별 적합도 & 채택

| 게임 ID | 메커닉 | variant | 이유 |
|---|---|---|---|
| factorization | 세로 드래그 (블록↑) | **stack** | 메커닉이 세로 흐름 의존 |
| math-graph-shift | 그래프 + 컨트롤 | **split** | 그래프 좌·컨트롤 우 자연스러움 |
| math-quick-quiz | 4지선다 | **split** | 문제 좌·보기·CTA 우 |
| physics-vector | 벡터 캔버스 | **split** | 캔버스 좌·컨트롤 우 |
| chemistry-balance | 계수 입력 | **split** | 수식 좌·입력·CTA 우 |
| history-timeline | 사건 정렬 | **split** | 타임라인 좌·정렬 카드 우 (또는 반대) |
| english-order | 어순 정렬 | **split** | 단어 카드 좌·정렬 영역·CTA 우 |
| english-blank | 빈칸 추론 | **split** | 본문 좌·보기·CTA 우 |
| english-word-match | 짝맞추기 | **match** | 메커닉 자체가 좌우, CTA 가 경쟁하면 안 됨 |
| vocab-typing | 자유 타이핑 | **split** | 단어 좌·입력+CTA 우 |
| custom-blank | 빈칸 | **split** | english-blank 와 동일 |
| custom-multiple-choice | 4지선다 | **split** | quick-quiz 와 동일 |
| custom-word-match | 짝맞추기 | **match** | english-word-match 와 동일 |
| custom-typing | 타이핑 | **split** | vocab-typing 과 동일 |

집계: split 10 / stack 1 / match 2 / typing variant 2 (자세히는 split). → split 다수 (12), stack 1, match 2.

### 3.3 좌우 분할 시 우측(CTA) 영역 구성

단순 버튼만 두면 우측 공백 큼 → 영역에 의미 있는 콘텐츠 배치:

```
[ 우측 영역 (lg+ 시 노출) ]
├─ 진행도 (1 / 5)          ← 모바일에선 header 안에 있던 거
├─ 게임 타이틀 + 단원 라벨
├─ 한 줄 가이드 (현재 phase 안내, 기존 sr-only 가시화 일부)
├─ (선택) 힌트 영역 placeholder — V2 슬롯
├─ CTA 버튼 (다음 / 정답 확인 / 마치기)
└─ 종료 / 메인으로 링크
```

모바일에선:
- 진행도·타이틀은 header 에
- CTA 는 footer 에
- 힌트·종료 는 메뉴 (≡) 안

이렇게 같은 정보가 viewport 폭에 따라 위치만 바뀜 (정보 보존).

### 3.4 핵심 Tailwind 구조

```tsx
<main
  className={cn(
    "mx-auto flex min-h-full flex-col px-6 py-6",
    variant === "split" && "lg:grid lg:max-w-[960px] lg:grid-cols-[3fr_2fr] lg:gap-8 lg:px-8",
    variant === "stack" && "max-w-[480px]",
    variant === "match" && "max-w-[480px] lg:max-w-[720px]",
  )}
>
  {variant === "split" ? (
    <>
      <section className="lg:order-1">{content}</section>
      <aside className="flex flex-col gap-6 lg:order-2">
        {header}
        {cta}
      </aside>
    </>
  ) : (
    <>
      {header}
      <section className="flex flex-1 flex-col">{content}</section>
      <footer className="mt-6">{cta}</footer>
    </>
  )}
  {liveRegion}
</main>
```

- `min-h-full` (옵션 A 의 핵심) — 부모 = AppShell 본문 스크롤 영역의 100% 따름. viewport 밖 문제 해결.
- `py-6` (24px) — 기존 py-8 보다 -8px, 작은 viewport 에서 +16px 콘텐츠 공간 확보.
- lg 분기 (1024px ↑) — 노트북 + 태블릿 가로. 그 이하는 모바일 세로 유지.

AppShell 보강 1줄 (이전 plan 4.2 그대로):
```tsx
<div className={`${CONTENT_MAX} h-[calc(100%-2.25rem)]`}>{children}</div>
```

## 4. 변경 명세

### 4.1 신규 파일

- `src/components/game-shell/GameShell.tsx` — 위 인터페이스 + 분기 로직
- `src/components/game-shell/index.ts` — re-export

### 4.2 변경 — 14 게임 컴포넌트

각 게임 main 을 GameShell 호출로 교체. 패턴:

Before ([factorization Component.tsx:170~248](src/games/factorization/Component.tsx#L170)):
```tsx
return (
  <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 py-8">
    <header>...</header>
    <p className="mt-6 ...">{card.hint}</p>
    <section className="mt-10 flex flex-1 ...">...</section>
    <footer className="mt-8">...</footer>
    <span className="sr-only" aria-live="polite">...</span>
  </main>
);
```

After:
```tsx
return (
  <GameShell
    variant="stack"
    header={<ProgressHeader index={cardIndex} total={cards.length} />}
    content={
      <>
        <p className="text-body text-type-secondary">{card.hint}</p>
        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-8">
          {/* BeforeView / AfterView / DropZone */}
        </div>
      </>
    }
    cta={<NextButton phase={phase} isLast={isLastCard} onNext={handleNext} />}
    liveRegion={<span className="sr-only" aria-live="polite">...</span>}
  />
);
```

각 게임마다:
1. variant 지정 (3.2 표 참조)
2. header / content / cta 분리
3. 모바일 일관성 위한 sub-component (ProgressHeader, NextButton) 는 game-shell 내부 또는 게임별 inline 유지

### 4.3 변경 — AppShell

[src/components/shell/app-shell.tsx:47](src/components/shell/app-shell.tsx#L47):
```tsx
<div className={`${CONTENT_MAX} h-[calc(100%-2.25rem)]`}>{children}</div>
```

이유: 자식 GameShell main 의 `min-h-full` 이 정확한 부모 높이 (= 본문 스크롤 영역 − sticky breadcrumb 36px) 를 잡도록.

### 4.4 단계적 적용 — 위험 분산

전부 한 PR 에 묶으면 디자인 회귀 risk 큼. 3 단계로 분리:

**Phase 1 — viewport fix 만 (긴급)** — PR A
- 14 게임 컴포넌트 `min-h-dvh → min-h-full`, `py-8 → py-6` 만 변경
- AppShell `h-[calc(100%-2.25rem)]` 보강
- GameShell 도입 없음. 기존 구조 유지.
- 변경 15 파일 × 1~2 줄. 위험 매우 낮음.
- **이 PR 머지 = 사용자 보고 버그 종결.**

**Phase 2 — GameShell + variant="stack/match" 적용** — PR B
- GameShell 컴포넌트 신규
- factorization (stack), english-word-match · custom-word-match (match) 만 GameShell 호출로 교체
- 시각적 변화 없음 (variant=stack/match 는 기존 세로 레이아웃 그대로)
- 추상화 위험만 검증.

**Phase 3 — variant="split" 적용** — PR C
- 나머지 11 게임 variant="split" 전환
- lg+ 좌우 분할 레이아웃 도입
- 게임별 디자인 검증 필요 (메커닉 영역 폭, 우측 영역 콘텐츠 적합성)

이 plan 은 3 phase 묶음 제안. 사용자가 Phase 1 만 먼저 가도 OK.

## 5. 검증

### 5.1 Playwright 케이스 (모든 phase 공통)

`scripts/qa/check-game-cta-visibility.spec.ts`:

```ts
const VIEWPORTS = [
  { name: "iPhone SE", width: 320, height: 568 },
  { name: "iPhone 13", width: 390, height: 844 },
  { name: "iPhone 13 landscape", width: 844, height: 390 },
  { name: "iPad", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 },
];

for (const game of OFFICIAL_GAMES) {
  for (const vp of VIEWPORTS) {
    test(`${game.id} @ ${vp.name} — CTA in viewport`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(`/games/${game.id}`);
      const cta = page.getByRole("button", { name: /다음|정답 확인|마치기|시작/ });
      const box = await cta.boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    });
  }
}
```

14 게임 × 6 viewport = 84 케이스.

### 5.2 Phase 3 추가 — 좌우 분할 시각 검증

- lg+ viewport (1280×800) 에서 콘텐츠 영역 / 우측 영역 비율 3:2 인지
- 우측 영역에 진행도·CTA 가 자연스럽게 stack 되는지 (간격, 정렬)
- factorization (stack) 과 word-match (match) 는 lg+ 에서도 중앙 단일 col 유지 — 시각 비교
- 1024px (lg breakpoint 경계) ±1px 에서 layout 점프 acceptable 한지

### 5.3 수동 회귀 체크리스트

> Retroactive 갱신: PR #17 의 Playwright e2e Phase 1 (10 게임 × 6 viewport = 60/60 green) 으로 모든 viewport 자동 회귀 차단. 수동 검증 의무 해소.

- [x] iPhone SE 320×568 — 14 게임 진입 즉시 CTA visible — e2e mobile-sm loose 10/10 pass
- [x] iPhone 13 390×844 — 동일 — e2e mobile strict 10/10 pass
- [x] iPhone 13 가로 844×390 — e2e mobile-land loose 10/10 pass
- [x] iPad 가로 1024×768 — split 게임 좌우 분할 시작 — e2e tablet strict 10/10 pass (이후 PR #18 F3 으로 split 도 aside 미지정 시 단일 컬럼 폴백)
- [x] 데스크탑 1280×800 — split 좌우 분할 자연스러움, stack 게임 중앙 480px — e2e desktop strict 10/10 pass + PR #18 design-review 시각 확인
- [x] 게임 진행 중 CTA 위치 안정 — PR #18 design-review 4 게임 phase 전환 확인
- [x] iOS Safari toolbar jitter 없음 (dvh 제거로 안정) — `min-h-full` 로 viewport 의존 제거

## 6. 위험 & 대안

**위험 1 — Phase 3 디자인 회귀**
와이드 스크린에서 우측 영역이 비어 보일 가능성 (게임에 따라 우측에 채울 정보 부족).
→ 우측 영역에 한 줄 가이드 + 진행도 시각화 (1/5 dot indicator 같은) 필수. 빈 공간 방치 금지.
→ 정 안 채워지면 splitRatio 를 `4fr_1fr` 정도로 좁혀서 CTA 만 우측에 두는 minimal split 도 가능.

**위험 2 — 메커닉별 콘텐츠 폭 부적합**
영어 빈칸 본문이 길면 split 좌측 (3fr ≈ 540px @ 1280) 만으로 부족할 수 있음.
→ 게임별로 splitRatio override 가능. english-blank 는 `4fr_2fr` 또는 split 비활성하고 max-w 키운 stack.

**위험 3 — Phase 3 의 lg breakpoint 갈등**
1024px 정확히에서 layout 점프. 사용자 viewport 변화시 jarring.
→ Phase 3 단계에서 실제 환경 (Chrome devtools responsive mode) 으로 jitter 점검. 필요 시 md (768px) 부터 점진 전환 (`md:grid-cols-[1fr_1fr] lg:grid-cols-[3fr_2fr]`).

**위험 4 — 추상화 비용**
GameShell 이 14 게임 모두 깔끔하게 안 맞을 수 있음 (예: vocab-typing 의 키보드 영역).
→ GameShell 은 강제 아닌 옵션. 안 맞는 게임은 escape hatch 로 raw main 유지 OK. Phase 2~3 진행 중 케이스별 판단.

**fallback — Phase 1 만 가고 멈춤**
Phase 2~3 디자인 검토에 시간 걸린다면 Phase 1 만 머지하고 추후 결정. 그래도 사용자 보고 버그는 해결 상태.

## 7. 실행 단계

1. 이 plan 승인
2. feature 브랜치 `fix/game-cta-layout-phase1` — Phase 1 만
3. 15 파일 수정 → lint·typecheck → Playwright Phase 1 검증 (CTA visibility 84 케이스)
4. dev 로 PR — Phase 1 종결
5. (별 PR) Phase 2 — GameShell 도입 + stack·match 게임 적용
6. (별 PR) Phase 3 — split variant 11 게임 + 디자인 리뷰 + 좌우 분할 적용

각 phase 가 독립 머지 가능 → 위험 분산 + 빠른 사용자 가치 전달.

## 8. 작업 항목 / 진행

### Phase 1 — viewport fix (PR [#11](https://github.com/curea-co/pullim-games/pull/11) — MERGED)

- [x] feature 브랜치 `fix/game-cta-layout-phase1` 생성
- [x] AppShell children wrapper 에 `h-[calc(100%-2.25rem)]` 보강 — [src/components/shell/app-shell.tsx:47](src/components/shell/app-shell.tsx#L47) (코드 grep 확인됨)
- [x] 14 게임 main 클래스 일괄 수정 (`min-h-dvh → min-h-full`, `py-8 → py-6`)
  - 자체 게임 7종: factorization, math-graph-shift, physics-vector, chemistry-balance, history-timeline, english-order, english-word-match
  - mechanics 4종 (호출 게임 자동 적용): BlankComponent, QuickQuizComponent, TypingComponent, WordMatchComponent
  - 검증: `min-h-full` 19건 확인 / `py-8` 0건 잔존
- [x] 완료 화면 `py-10` 보존 (콘텐츠 짧음, 시각 호흡 유지) — 11 파일 grep 확인
- [x] `bun run lint` · `bun run typecheck` 통과
- [x] PR #11 생성 + dev 머지 (commit 85350e0)
- [x] **plan 누락 발견 + fix** — [src/app/games/[gameId]/not-found.tsx:7](src/app/games/[gameId]/not-found.tsx#L7) `min-h-dvh → min-h-full` (PR [#15](https://github.com/curea-co/pullim-games/pull/15) MERGED, commit aaf0de1). 사용자 보고 버그(게임 진입 CTA)와 무관 (미등록 gameId 진입 시 페이지) 하지만 동일 viewport 패턴 → 정합성 확보.
- [x] Playwright 자동 검증 스크립트 — PR #17 로 60 케이스 (official 10 × 6 viewport) 도입. 84 케이스 (custom-* 4 게임 × 6 viewport 추가) 는 후속 plan [2026-05-12_daily-outcome-cleanup.md](2026-05-12_daily-outcome-cleanup.md) §2.2 로 흡수

### Phase 2 — GameShell wrapper + stack/match (PR [#12](https://github.com/curea-co/pullim-games/pull/12) — MERGED)

- [x] feature 브랜치 `feat/game-shell-wrapper` 생성
- [x] `src/components/game-shell/GameShell.tsx` 신규 (header / content / cta / liveRegion + variant 인터페이스)
- [x] `src/components/game-shell/index.ts` re-export
- [x] factorization → `variant="stack"` 전환 (grep 확인 line 172)
- [x] english-word-match → `variant="match"` 전환 (grep 확인 line 201)
- [x] WordMatchComponent (mechanics) → `variant="match"` 전환 (grep 확인 line 250). custom-word-match 자동 적용.
- [x] `bun run typecheck` · `lint` · `build` 통과
- [x] PR #12 생성 + dev 머지 (commit 740a1b2)

### Phase 3 — split variant 11 게임 (PR [#13](https://github.com/curea-co/pullim-games/pull/13) — MERGED)

- [x] feature 브랜치 `feat/game-shell-split-layout` 생성
- [x] 자체 게임 5종 `variant="split"` 전환 (전부 grep 확인)
  - [x] math-graph-shift
  - [x] physics-vector
  - [x] chemistry-balance
  - [x] history-timeline
  - [x] english-order
- [x] mechanics 3종 `variant="split"` 전환 (호출 게임 6 자동 적용)
  - [x] QuickQuizComponent → math-quick-quiz, custom-multiple-choice
  - [x] BlankComponent → english-blank, custom-blank
  - [x] TypingComponent → vocab-typing, custom-typing
- [x] `bun run typecheck` · `lint` · `build` 통과 (26 static pages 정상)
- [x] PR #13 생성 + dev 머지 (commit 2dce442)
- [x] **디자인 회귀 검증** — 후속 plan 2개로 흡수:
  - [x] 게임별 우측 영역 콘텐츠 적합성 — [2026-05-11_game-shell-right-area.md](2026-05-11_game-shell-right-area.md) (PR #16 chemistry-balance Phase A 머지)
  - [x] 1023→1024px breakpoint jarring — PR #18 design-audit 검증 + F3 으로 단일 컬럼 폴백 (split aside 없으면 breakpoint 점프 X)
  - [x] 게임별 `splitRatio` override / minimal split — F3 폴백 정책으로 대체 (aside 콘텐츠 있는 게임만 분할)

### 마무리

- [x] 3 PR 모두 dev 머지 (사용자 머지 완료 — 2026-05-11)
- [x] **자가 검증** (이 문서 §8 작업 항목 vs 실제 코드 상태 grep · build) — 누락 1건 (not-found.tsx) 식별
- [x] not-found.tsx fix 후속 PR (PR #15 머지 완료)
- [x] dev → main 머지 + 배포 검증 — PR #18 (2026-05-12 02:02 UTC, main 7d8f63b) 으로 Phase 1~3 모두 main 배포. 후속 작업은 [2026-05-12_daily-outcome-cleanup.md](2026-05-12_daily-outcome-cleanup.md) §3 dev→main 릴리스 묶음에 흡수.
- [x] Phase 3 디자인 회귀 수동 검증 — 우측 영역 콘텐츠 충실화로 후속 plan [2026-05-11_game-shell-right-area.md](2026-05-11_game-shell-right-area.md) 에 흡수 (PR #16 머지 완료)
- [x] 본 plan archive 이동 — 본 plan 머지된 후속 cleanup PR 에서 `proc/archive/plan/2026-05-11_game-cta-layout.md` 로 이동 예정 (cleanup plan §6 작업 항목)

## 9. 산출물

- `src/components/game-shell/GameShell.tsx` (Phase 2 신규)
- `src/components/game-shell/index.ts`
- `src/games/*/component.tsx` × 7 자체 게임 (Phase 1 클래스 수정 → Phase 2~3 wrapper 호출)
- `src/components/game-mechanics/*` × 4 (Phase 1 클래스 → Phase 2~3 wrapper 호출 — 호출 게임 7종 자동 적용)
- `src/components/shell/app-shell.tsx` — children wrapper 1줄 (Phase 1)
- `scripts/qa/check-game-cta-visibility.spec.ts` — 미도입 (별 후속)
- 본 plan → 완료 후 `proc/archive/plan/2026-05-11_game-cta-layout.md` archive
