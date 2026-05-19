# 2026-05-19 — Plan E: modes 비-default 정식 구현 (review-queue·time-attack·deep-recall)

- **상태**: PARTIAL-COMPLETE (2026-05-19) — 코어 resolveRating (3 모드 정식 분기) PR #81 머지. D1.1~D1.6 사용자 합의 완료. UI 통합 (타이머·selectNextCards 확장·URL searchParams·홈/허브 진입점) 다음 세션 이관 — 약 430 LOC + 17 호출처 영향.
- **트리거**: audit v3 §4 단일 백본 진척 — modes wrapper 정식 1/4 (default 만), 비-default 3 모드는 fallback + warn 상태. V0.4+ 트랙으로 정식 구현 의무.
- **메모리 룰**:
  - **단일 백본 + 다중 게임 모드** (project_architecture_decision) — 본 plan이 다중 모드 정식 진입
  - **하이퍼캐주얼 유지, RPG 금지** (feedback_scale_hypercasual) — 모드 = OK (지하철·점심 5분 캐주얼 결), 시즌·뱃지·랭킹 X
  - **학습효과 > 중독성** (feedback_design_priorities) — 모드는 학습 효과 우선
- **연관**: `proc/archive/plan/2026-05-18_fsrs-backbone.md` (modes wrapper 신설), audit v3 §4.

## 0. 현 상태

### A. modes wrapper (default 정식)
- `src/lib/core/fsrs/modes/index.ts` — `GameMode` enum 4종 선언, default 정식 구현
- 비-default (`review-queue`·`time-attack`·`deep-recall`) — silent fallback + dev `console.warn` (Plan A C4 fix)
- 17 호출처 모두 `applyAndPersist('default', ...)` 사용

### B. 모드별 의도 (메모리 룰 기준)
- **review-queue**: due-soon 우선 N개 카드 자동 선택. 사용자가 "오늘 풀 카드" 1터치 진입
- **time-attack**: 시간 제한 (30초·1분) 안에 풀이. 빠른 정답 → easy, 늦은 정답 → good, 미응답 → again
- **deep-recall**: `getRetrievability` 낮은 카드만 반복. R<0.6 카드 N개를 반복 풀이까지 진행

### C. 학습효과 우선 룰 적용
- 모든 모드는 학습 곡선 우선. 점수·뱃지·시즌 X
- time-attack 시간 제한은 학습 압박 X — 캐주얼 톤 유지 (3초 카운트다운 → 자동 다음)

## 1. 추천 설계

### A. mode 진입 패턴

```ts
// 홈 또는 게임 허브에서 mode 선택
<Link href="/games/math-quick-quiz?mode=time-attack">
  타임어택
</Link>

// 게임 컴포넌트에서 mode 추출
const searchParams = useSearchParams();
const mode = (searchParams.get("mode") ?? "default") as GameMode;
// applyAndPersist(mode, ...) 호출
```

→ 기존 17 호출처는 `applyAndPersist('default', ...)` 그대로 — URL searchParams 가 default 면 영향 0.

### B. 각 모드 rating 정책

#### review-queue
- 카드 선택: `selectNextCards(states, N, now)` (이미 구현, R 오름차순)
- rating 결정: default 동일
- 차별 포인트: 카드 선택 알고리즘만 (rating 결정 X)

#### time-attack
- 타이머: 30초 / 카드 또는 1분 / 5카드
- rating:
  - `elapsedMs < 5000` + correct + wc=0 → **easy** (빠른 정답)
  - `elapsedMs >= 5000` + correct → default 패턴 (`good`/`hard`)
  - 시간 초과 → `again` (correct=false 와 동일)

#### deep-recall
- 카드 풀: `getRetrievability(state, now) < 0.6` 카드만
- rating: default 와 동일하나 oldcard 우선 가중치

### C. UI 진입점
- 홈 RecommendationCard 옆 "다른 모드로 풀기" 보조 링크 (V0.4 옵션)
- 게임 허브에서 게임별 모드 선택 (V0.4 옵션)
- 모드 selector UI = V0.4+ 별 plan trigger

## 2. 결정점

### D1 — 모드별 정책 합의 (각 모드 사용자 결정 필수)
**review-queue**:
- D1.1: 카드 수 N — 5 (현 default와 동일) 또는 10·15
- D1.2: 진입 트리거 — 홈에서 1 터치, 게임 허브 일괄 due-soon 진입

**time-attack**:
- D1.3: 타이머 단위 — 카드별 30초 / 세션 전체 1분 / 5문제 1분
- D1.4: 시간 초과 페널티 강도 — `again` 강제 vs default 패턴

**deep-recall**:
- D1.5: R 임계값 — 0.5 / 0.6 / 0.7 (낮을수록 잊혀가는 카드만)
- D1.6: 반복 횟수 — 정답 1회 후 종결 / 정답 2회 후 종결

### D2 — Phase 분할 단위
- **(A 추천)** 모드별 별 PR — review-queue 먼저 (가장 단순), time-attack, deep-recall 순.
- (B) 3 모드 한 PR — 작업 폭 큼.

→ A 채택.

### D3 — 진입 UI
- **(A 추천)** URL searchParams (`?mode=time-attack`) 단순 패턴. 홈·게임 허브에 보조 링크.
- (B) 모드 selector UI 컴포넌트 신규 — V0.4+ 별 plan.

→ A 채택 (V0.4 진입점), B 는 V0.5+.

## 3. 작업 항목

### Phase 1 — 사용자 합의 (별 회의 또는 비동기)
- [ ] D1.1·D1.2 review-queue 정책
- [ ] D1.3·D1.4 time-attack 정책
- [ ] D1.5·D1.6 deep-recall 정책
- 합의 산출: `proc/spec/04-사용자-경험.md` 또는 신규 spec 모드 §

### Phase 2 — review-queue 정식 구현 (1 PR)
- [ ] `modes/index.ts` `resolveRating('review-queue', outcome)` 정식 — silent fallback 제거
- [ ] `selectNextCards` 호출 위치 통합 (현재 일부 게임만 사용) — review-queue 모드일 때 자동 활성
- [ ] URL searchParams mode 처리 — 4 메커니즘 + 13 게임 컴포넌트 mode prop 전달
- [ ] modes/index.test.ts review-queue 분기 추가
- [ ] e2e — `?mode=review-queue` 진입 + due-soon 카드 우선 검증
- [ ] ui:audit 4 viewport ✅

### Phase 3 — time-attack 구현 (1 PR)
- [ ] `modes/index.ts` `resolveRating('time-attack', outcome)` 정식 — `elapsedMs` 사용
- [ ] 4 메커니즘 컴포넌트에 타이머 컴포넌트 통합 (`TimeAttackTimer`)
- [ ] `ReviewOutcome.elapsedMs` 측정·전달 — 게임별 submitTime 추적
- [ ] 타이머 표시 UI (game-shell sticky top 또는 카드 위)
- [ ] e2e — 시간 내 정답 → easy / 시간 초과 → again
- [ ] ui:audit 4 viewport ✅

### Phase 4 — deep-recall 구현 (1 PR)
- [ ] `modes/index.ts` `resolveRating('deep-recall', outcome)` 정식
- [ ] `selectNextCards` 확장 — R 임계 < 0.6 만 반환
- [ ] 빈 풀 처리 — "잊혀가는 카드 없음" 화면
- [ ] e2e — `?mode=deep-recall` 진입 + R 낮은 카드만 노출
- [ ] ui:audit ✅

### Phase 5 — 진입 UI (옵션, 별 PR)
- [ ] 홈 RecommendationCard 옆 "다른 모드로 풀기" 보조 링크 (V0.4+)
- [ ] 게임 허브 mode 필터·선택 (V0.4+)
- 본 plan §3 의 다른 Phase는 URL searchParams 만, UI 진입점은 별 PR

## 4. 비스코프

- **모드 selector UI 컴포넌트** — V0.5+ 별 plan
- **모드 통계** (dashboard 에 mode 별 attempts 분해) — V0.5+
- **사용자 모드 선호 저장** — V0.5+

## 5. 영향도

| Phase | 변경 | LOC |
|---|---|---|
| 1 (합의·spec) | docs only | ≈+100 |
| 2 (review-queue) | modes wrapper 정식 + URL searchParams | ≈+150 |
| 3 (time-attack) | 타이머 UI + elapsedMs | ≈+250 |
| 4 (deep-recall) | selectNextCards 확장 | ≈+100 |
| 5 (진입 UI 옵션) | 홈·허브 링크 | ≈+50 |

→ 총 ≈+650 LOC. **가장 큰 트랙** (Plan E). V0.4 본 진입.
