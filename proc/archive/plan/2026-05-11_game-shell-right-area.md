# GameShell 우측 영역 — 콘텐츠 충실화 (lg+ split variant)

DRAFT · 2026-05-11

## 0. 컨텍스트

본 plan 은 [2026-05-11_game-cta-layout.md](2026-05-11_game-cta-layout.md) 의 후속.

전제:
- 본 plan(cta-layout) Phase 3 머지로 11 게임이 lg+ 에서 좌우 분할 (`variant="split"`) 적용됨
- 우측 영역(`2fr ≈ 384px @ 1280`) 은 현재 **진행도 + CTA 버튼** 만 있음 → 게임에 따라 빈 공간 큼
- cta-layout plan §6 위험 1: "우측 영역이 비어 보일 가능성"  → 이번에 대응

사용자 가치:
- lg+ 진입 즉시 게임 가이드가 시야 안에 있음 (지금은 sr-only 또는 mobile-only 텍스트)
- 진행도 / 힌트 / 종료 등 보조 UI 의 위치 일관성

## 1. 진단

현재 GameShell.tsx split variant 우측 영역:

```tsx
<aside className="mt-6 flex flex-col gap-6 lg:order-2 lg:mt-0 lg:justify-between">
  <div className="hidden lg:block">{header}</div>  ← 진행도 (1/5) + 메뉴 ≡
  <div>{cta}</div>                                   ← "다음 →" / "정답 확인" 등
</aside>
```

- 두 요소 사이 `justify-between` → header 위쪽, cta 아래쪽
- 중간 공간 ≈ 400~600px (게임 콘텐츠 높이에 따라 가변) 가 비어 있음

게임 메커닉별 "어떻게 푸는지" 안내는 대부분 `sr-only aria-live` 에만 존재:

```tsx
<span className="sr-only" aria-live="polite">
  {phase === "playing" && "계수를 조정해 양변 원자 수를 맞춰주세요"}
  ...
</span>
```

→ 시각적 사용자는 메커닉 직관에 의존. lg+ 우측 공간이 가이드 노출에 이상적 자리.

## 2. 목표

1. lg+ split 게임 11개의 우측 영역에 의미 있는 보조 콘텐츠 노출
2. 게임마다 다른 가이드/힌트를 wrapper 가 강제하지 않게 — 자유도 + 일관성 균형
3. 모바일은 그대로 — 우측 영역은 lg+ 전용 (md 이하 영향 0)
4. 기존 `sr-only` live region 은 보존 (a11y 회귀 없이 시각 채널 추가)

비목표:
- stack (factorization) / match (word-match) variant 변경 — 좌우 분할 자체가 없음
- 게임 메커닉 변경
- 추천 / FSRS 카드 정보 표시 — 별 plan

## 3. 옵션 분석

### 옵션 A — 단일 자유 슬롯 `aside?: ReactNode`

GameShell 에 `aside` prop 하나 추가. lg+ 우측 영역 중간(`header` 와 `cta` 사이) 에 렌더. 모바일에선 노출 안 함 (또는 footer 위로 흡수).

```tsx
<GameShell
  variant="split"
  header={...}
  content={...}
  aside={<GuideText>계수를 조정해 양변 원자 수를 맞춰주세요</GuideText>}
  cta={...}
/>
```

✅ 인터페이스 가장 단순 — 1 prop 추가. 게임이 콘텐츠 자유 구성.
✅ 게임마다 다른 결 (가이드만 / 힌트 버튼 포함 / 풀이 단계 시각화 등) 모두 흡수.
❌ 일관성은 게임 작성자가 책임. wrapper 가 "여기엔 가이드만" 같은 강제 없음 → 시각 회귀 위험.
❌ 모바일 정책 명시 필요 (안 보임? footer 흡수? menu 흡수?).

### 옵션 B — 슬롯 분리 `guide?`, `hintSlot?`, `footerLinks?`

목적별 prop 3~4개. wrapper 가 슬롯별 위치/스타일 통제.

✅ 일관성 강제. 우측 영역 시각 디자인 통제 가능.
❌ 슬롯 종류가 미래에 늘어날 가능성 큼 (V2 에 다른 콘텐츠 추가 시 prop 또 추가).
❌ 게임마다 채울 수 있는 슬롯이 다르면 빈 prop 으로 인한 boilerplate.

### 옵션 C — composition 패턴 `<GameShell.Aside>`, `<GameShell.Hint>` 등

GameShell 이 sub-component 모음 export, 게임이 children 으로 조합:

```tsx
<GameShell variant="split">
  <GameShell.Header>...</GameShell.Header>
  <GameShell.Content>...</GameShell.Content>
  <GameShell.Aside>
    <GameShell.Guide>...</GameShell.Guide>
    <GameShell.Hint>...</GameShell.Hint>
  </GameShell.Aside>
  <GameShell.Cta>...</GameShell.Cta>
</GameShell>
```

✅ React 다운 확장성. 슬롯 추가 시 sub-component 만 export.
❌ 큰 리팩터 — 11 게임 호출부 전부 변경. cta-layout plan §3.1 의 props 인터페이스에서 벗어남.
❌ 추상화 비용 큼. V1 단계에 과한 선택.

### 추천 — 옵션 A

이유:
- prop 1개 추가가 변경 최소. 11 게임 점진 적용 가능 (한 게임씩 채워나가도 OK).
- 게임 메커닉별로 우측에 채울 콘텐츠가 다 다름 — 슬롯 분리(B) 강제는 부적합.
- composition(C) 은 게임 종류가 더 많이 늘어났을 때 검토할 패턴. 지금은 시기상조.
- 일관성은 GameShell 안의 wrapper 스타일링 + 게임 작성 가이드(코드 주석) 로 보강.

## 4. 설계

### 4.1 GameShell 시그니처 확장

```diff
 interface GameShellProps {
   header: ReactNode;
   content: ReactNode;
   cta: ReactNode;
+  /**
+   * lg+ split 시 우측 영역 header 와 cta 사이에 렌더되는 보조 콘텐츠.
+   * 가이드/힌트/풀이 단계 등 게임마다 자유.
+   * stack/match variant 에서는 무시됨 (좌우 분할 없음).
+   * 모바일(~md) split 에서도 무시됨 — content 안에 별도로 노출 필요시 게임이 책임.
+   */
+  aside?: ReactNode;
   variant?: GameShellVariant;
   splitRatio?: string;
   liveRegion?: ReactNode;
 }
```

### 4.2 GameShell 렌더 변경

split 분기의 `<aside>` 안에 가운데 슬롯 추가:

```diff
 <aside className="mt-6 flex flex-col gap-6 lg:order-2 lg:mt-0 lg:justify-between">
   <div className="hidden lg:block">{header}</div>
+  {aside && (
+    <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:gap-3">
+      {aside}
+    </div>
+  )}
   <div>{cta}</div>
 </aside>
```

- `lg:flex-1` 로 중간 슬롯이 남는 세로 공간 차지 → header(상) / aside(중) / cta(하) 시각 분배
- `hidden lg:flex` 로 모바일 노출 안 함 (정책 명시)

### 4.3 권장 콘텐츠 패턴

GameShell.tsx 의 JSDoc 에 권장 패턴 명시:

```tsx
// 권장 사용 예 (메커닉 가이드):
aside={
  <p className="text-helper text-type-secondary">
    계수를 조정해 양변 원자 수를 맞춰주세요
  </p>
}

// 권장 사용 예 (가이드 + 힌트 버튼):
aside={
  <>
    <p className="text-helper text-type-secondary">{guideText}</p>
    {!hintUsed && (
      <button onClick={showHint} className="...">힌트 보기</button>
    )}
  </>
}
```

자유도 유지하되 패턴 통일.

## 5. 메커닉별 우측 영역 mock

각 split 게임의 phase 별 안내. 대부분 기존 `sr-only` 텍스트를 시각화 + 정규화:

| 게임 | playing 가이드 | feedback/correct | 추가 슬롯 |
|---|---|---|---|
| math-quick-quiz | 보기 중 정답을 골라주세요 | 정답이에요 / 정답은 다른 보기였어요 | — |
| english-blank | 빈칸에 들어갈 단어를 골라주세요 | (해설 — 이미 content 안) | — |
| vocab-typing | 뜻을 보고 단어를 입력해주세요 | 정답이에요 | 힌트 버튼 (`hintUsed` 전) |
| math-graph-shift | a · h · k 를 조정해 두 곡선을 일치시켜요 | 일치했어요 | 오답 횟수 |
| physics-vector | rx · ry 를 조정해 합벡터를 그려요 | 합벡터 일치 | 오답 횟수 |
| chemistry-balance | 계수를 조정해 양변 원자 수를 맞춰요 | 균형이 맞았어요 | 오답 횟수 |
| history-timeline | 위→아래 = 과거→현재 순으로 놓아주세요 | 정답이에요 | — |
| english-order | 단어를 골라 어순을 맞춰주세요 | 정답이에요 | — |
| custom-blank | english-blank 와 동일 | 동일 | — |
| custom-multiple-choice | math-quick-quiz 와 동일 | 동일 | — |
| custom-typing | vocab-typing 과 동일 | 동일 | 힌트 버튼 |

집계: 8 종 메커닉, 11 게임. mechanics 공용 (Blank/QuickQuiz/Typing) 한 번 적용 = 6 게임 자동.

## 6. 변경 명세

### 6.1 신규 코드

- [src/components/game-shell/GameShell.tsx](src/components/game-shell/GameShell.tsx) — `aside?` prop 추가 + split 렌더 가운데 슬롯

### 6.2 게임별 적용 — 11 split 게임

각 게임의 phase 상태로 `aside` 내용 결정. 패턴:

```tsx
<GameShell
  variant="split"
  header={...}
  content={...}
  aside={
    <>
      <p className="text-helper text-type-secondary">
        {phase === "playing" ? "계수를 조정해 양변 원자 수를 맞춰요" :
         phase === "wrong"   ? "균형이 맞지 않아요. 다시 해보세요." :
         "균형이 맞았어요"}
      </p>
      {wrongCount > 0 && phase !== "correct" && (
        <p className="text-helper tabular text-type-secondary">오답 {wrongCount}회</p>
      )}
    </>
  }
  cta={...}
  liveRegion={...}
/>
```

가이드 텍스트는 기존 sr-only 의 그것을 재사용 (= a11y 와 시각 채널 동기화).

기존 `content` 안에 있던 일부 보조 표시 (예: chemistry-balance 의 `wrongCount` 표시) 는 `aside` 로 이전 — 우측 공간 활용. content 영역은 메커닉 본체만 남도록 정리.

대상 파일:
- src/games/math-graph-shift/component.tsx
- src/games/physics-vector/component.tsx
- src/games/chemistry-balance/component.tsx
- src/games/history-timeline/component.tsx
- src/games/english-order/component.tsx
- src/components/game-mechanics/QuickQuizComponent.tsx (→ math-quick-quiz, custom-multiple-choice)
- src/components/game-mechanics/BlankComponent.tsx (→ english-blank, custom-blank)
- src/components/game-mechanics/TypingComponent.tsx (→ vocab-typing, custom-typing)

총 8 파일 변경 → 11 게임 적용.

## 7. 단계 분할

위험 분산 + 빠른 검증 위해 2 단계:

**Phase A — GameShell 시그니처 확장 + pilot 1 게임**
- GameShell 에 `aside?` prop 추가
- chemistry-balance 만 우측 영역 적용 (가이드 + 오답 횟수)
- lg+ 우측 영역 디자인 검증 (간격, 정렬, 시각 호흡) — 사용자 시각 리뷰
- PR 단위: 작음 (2 파일)

**Phase B — 나머지 10 게임 적용**
- 4 자체 게임 + 3 mechanics (6 게임 자동)
- 메커닉별 가이드 텍스트는 §5 표 따름
- PR 단위: 8 파일 변경

Phase A 디자인 OK 가 떨어지면 Phase B 일괄 진행.

## 8. 검증

### 8.1 자동 검증

- `bun run typecheck` / `lint` / `build` — 모든 phase
- `min-h-dvh` 잔존 0건 유지 (회귀 방지)
- `aside` prop 사용 게임 11개 grep 확인 (Phase B 완료 시)

### 8.2 시각 검증 (수동, Phase A 의 핵심 게이트)

chemistry-balance @ 1280×800:
- [ ] 우측 영역에 가이드 텍스트 / 오답 횟수 자연스럽게 노출
- [ ] header(상) — aside(중) — cta(하) 간격 시각적 균형
- [ ] 게임 콘텐츠 영역(좌) 과 우측 영역의 폭 비율 3:2 유지
- [ ] phase 전환 (playing → wrong → correct) 시 가이드 텍스트 부드럽게 갱신

chemistry-balance @ 390×844 (모바일):
- [ ] `aside` 미노출 (모바일 정책 정상)
- [ ] 기존 모바일 레이아웃 동일 (회귀 없음)

Phase B 후 11 게임 전부:
- [ ] 각 게임 lg+ 진입 즉시 가이드 visible
- [ ] 모바일 노출 변화 없음
- [ ] sr-only live region 그대로 (a11y 보존)

## 9. 위험 & 대안

**위험 1 — 우측 영역이 여전히 비어 보이는 게임**
가이드 한 줄 + 오답 횟수만으로는 공간 부족할 수 있음 (특히 history-timeline 처럼 진행 정보가 단순한 게임).
→ 게임별로 `aside` 콘텐츠 확장 (단원/타이틀 노출, 진행도 시각화 dot indicator 등). Phase B 진행 중 케이스 추가.

**위험 2 — 가이드 텍스트가 sr-only 와 중복**
시각 채널 + a11y 채널 양쪽 노출 → 스크린리더 사용자에게 같은 정보 두 번. 단, aria-live="polite" 는 phase 전환 알림용이고 시각 가이드는 정적이라 의도적 중복 OK.
→ aside 의 텍스트에는 `aria-hidden="true"` 적용 또는 sr-only 표현과 형태 분리. Phase A 에서 결정.

**위험 3 — 11 게임 일괄 적용 시 디자인 회귀 발견 어려움**
2 단계 분할로 완화. Phase A pilot 1 게임에서 디자인 합의된 후 Phase B 일괄 진행.

**위험 4 — 모바일에서 가이드 정보 손실**
현재 모바일은 sr-only 만 있음. 우측 영역 만든다고 모바일 가이드가 새로 생기진 않음. 모바일 가이드는 별 plan (별도 디자인 결정).

## 10. 작업 항목 / 진행

### 부속 정리 (본 plan 시작 전)

- [x] 직전 plan ([2026-05-11_game-cta-layout.md](2026-05-11_game-cta-layout.md)) §8 의 not-found 체크박스 2건 `[ ]` → `[x]` 갱신 (PR #15 머지 반영). 이번 PR 에 포함.

### Phase A — pilot (chemistry-balance)

- [x] feature 브랜치 `feat/game-shell-aside-slot` 생성
- [x] [src/components/game-shell/GameShell.tsx](src/components/game-shell/GameShell.tsx) — `aside?: ReactNode` prop 추가 + split 분기 가운데 슬롯 렌더 (`lg:flex-1` 으로 header/aside/cta 시각 분배)
- [x] [src/games/chemistry-balance/component.tsx](src/games/chemistry-balance/component.tsx) — `aside` 적용 (phase 별 가이드 + 오답 횟수)
- [x] 모바일 회귀 방지 — `wrongCount` 표시 content 영역에 `lg:hidden` 으로 복원 (aside 는 lg+ 전용이라 모바일 시각 손실 방지)
- [x] `bun run typecheck` · `lint` · `build` 통과
- [x] 직전 plan §8 동기화 (not-found 항목 [x]) — 같은 PR 에 포함
- [ ] PR 생성 + dev 머지
- [ ] **시각 디자인 검증** (사용자) — §8.2 chemistry-balance 체크리스트
- [ ] Phase A 결과로 Phase B 진행 여부 결정

### Phase B — 나머지 10 게임

- [ ] feature 브랜치 `feat/game-shell-aside-rollout`
- [ ] 4 자체 게임 적용
  - [ ] math-graph-shift
  - [ ] physics-vector
  - [ ] history-timeline
  - [ ] english-order
- [ ] 3 mechanics 적용 (호출 게임 6 자동)
  - [ ] QuickQuizComponent → math-quick-quiz, custom-multiple-choice
  - [ ] BlankComponent → english-blank, custom-blank
  - [ ] TypingComponent → vocab-typing, custom-typing
- [ ] `bun run typecheck` · `lint` · `build` 통과
- [ ] PR 생성 + dev 머지
- [ ] 11 게임 전부 lg+ 시각 검증 (수동)

### 마무리

- [ ] dev → main 머지 + 배포 검증 (사용자)
- [ ] 본 plan 자가 검증 (§8 체크리스트 vs 실제 코드)
- [ ] 본 plan → `proc/archive/plan/2026-05-11_game-shell-right-area.md` 로 이동
- [ ] (선택) 직전 plan 도 함께 archive — cta-layout plan §8 마무리의 디자인 회귀 수동 검증 항목이 본 plan 으로 흡수됐으므로 archive 가능

## 11. 산출물

- `src/components/game-shell/GameShell.tsx` — `aside?` prop 추가 (Phase A)
- `src/games/*/component.tsx` × 5 자체 게임 (Phase A: 1, Phase B: 4)
- `src/components/game-mechanics/*` × 3 mechanics (Phase B — 호출 게임 6 자동 적용)
- 직전 plan §8 의 not-found 체크박스 [x] 갱신 (Phase A PR 에 포함)
- 본 plan → 완료 후 archive
