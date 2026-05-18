# 2026-05-18 — FSRS 백본 — 다중 게임 모드 wrapper + FSRS-6 업그레이드

- **상태**: ACCEPTED (2026-05-18) — §1 합의 완료 (D1~D4 A 채택, D5 FSRS-5/6 동시 업그레이드 채택) → Phase 0 PR 진입.
- **트리거**: 메모리 룰 *단일 백본 + 다중 게임 모드*. FSRS 인프라(ts-fsrs 4.7.1) + 21 게임 통합 + streak wrapper 모두 완료. 다음 미스 = "단일 모드" 묵시 가정. 게임마다 rating 결정 로직이 흩어져 있어 새 모드(복습큐·타임어택·심층) 진입 시 21 호출처 재수정 필요. 동시에 ts-fsrs 5.x (FSRS-6) 가 stable 진입(2025-05-12 v5.0.0, 현 latest 5.3.3) — 알고리즘 1년 뒤처져 있음.
- **메모리 룰**: 하이퍼캐주얼 유지, RPG 금지 (모드는 OK — 지하철·점심 5분 캐주얼 결). 단일 백본 1개, 모드만 다양화.
- **연관 plan**: `proc/archive/plan/2026-05-15_fsrs-streak-backbone.md` (streak wrapper 패턴 차용).

---

## 0. 현 상태 분석

### FSRS — 알고리즘·저장·wrapper 통합 완료 ✅
- `ts-fsrs ^4.7.1` 의존성. `fsrs(generatorParameters())` 단일 인스턴스.
- `src/lib/core/fsrs/index.ts` — `Rating = 'again'|'hard'|'good'|'easy'`, `createInitialState`, `reviewCard(prev, rating)`, `getRetrievability`, `selectNextCards`.
- `src/lib/core/storage/srs.ts` — `loadSrsState`/`saveSrsState`/`saveSrsAndRecord`(streak 동거 wrapper)/`loadAllSrsStates`/`clearAllSrsStates`.
- `src/lib/core/dashboard/stats.ts` + `src/components/RecommendationCard/` — SRS 상태 집계·due-soon 우선순위 노출.
- 17 호출처 모두 `saveSrsAndRecord` wrapper 사용 (4 메커니즘 + 13 개별 게임).

### 미스 — rating 결정 로직 분산 ❌
21 게임·4 메커니즘 각각 자체 rating 결정 로직:

```
// TypingComponent.tsx 발췌
const rating = hintUsed ? 'hard'
  : wrongCount === 0 ? 'good'
  : wrongCount === 1 ? 'hard'
  : 'again';
```

- 4 메커니즘 (Typing/WordMatch/Blank/QuickQuiz) — 비슷하나 미세 차이.
- 13 개별 게임 (factorization/cloze-multi/.../math-graph-shift) — 게임 메커닉별로 자체 결정.

→ 새 모드 도입 시 17~21 곳 rating 결정 로직 재수정 필요. 모드별 wrapper 부재.

---

## 1. 추천 설계 — `GameMode` + `applyReview` wrapper

### 핵심 아이디어
게임 컴포넌트는 **outcome** (정답/오답 + 부가 신호) 만 넘기고, 모드 wrapper 가 rating 결정 + `reviewCard` 호출.

```ts
// src/lib/core/fsrs/modes/index.ts (Phase 1 신규)

export type GameMode = 'default' | 'review-queue' | 'time-attack' | 'deep-recall';

export interface ReviewOutcome {
  correct: boolean;
  wrongCount: number;       // 정답 전까지 누적 오답 (reveal 포함 X)
  hintUsed: boolean;        // 힌트 사용 여부 (메커닉별 의미 다를 수 있음)
  elapsedMs?: number;       // time-attack 모드용 (default 모드에서는 무시)
}

// 순수 — 모드 + outcome → Rating.
export function resolveRating(mode: GameMode, outcome: ReviewOutcome): Rating;

// 순수 — 모드 적용 후 다음 SRS 상태.
export function applyReview(
  mode: GameMode,
  prev: CardSrsState,
  outcome: ReviewOutcome,
  now?: Date,
): CardSrsState;

// I/O wrapper — load → applyReview → saveSrsAndRecord. 게임 컴포넌트가 직접 호출.
export function applyAndPersist(
  mode: GameMode,
  gameId: string,
  cardId: string,
  outcome: ReviewOutcome,
  now?: Date,
): CardSrsState;
```

### default 모드 rating 규칙 (현재 Typing 패턴 표준화)

| outcome | rating |
|---|---|
| correct + !hintUsed + wrongCount=0 | good |
| correct + (hintUsed OR wrongCount=1) | hard |
| correct + wrongCount≥2 | again |
| !correct (reveal 트리거) | again |

→ 21 게임 현 분포 검증 시 미세 차이 발견되면 Phase 1 §1.1 보강.

### 갈래 분석 (검토 후 채택)

| 안 | 설계 | 채택 | 근거 |
|---|---|---|---|
| A | 게임마다 rating 결정 유지 + reviewCard 직접 호출 (현 상태) | 배제 | 새 모드 진입 시 17~21 곳 재수정 |
| B | `GameMode` enum + `applyReview` wrapper (모드별 rating 결정) | **채택** | streak `recordActivity` wrapper 패턴 동일. 컴포넌트는 outcome만 |
| C | mode-aware reviewCard 확장 (`reviewCard(prev, rating, mode)`) | 배제 | rating 책임이 호출처에 남음. 모드 분리 의미 X |
| D | strategy class — `class TimeAttackMode implements ReviewStrategy` | 배제 | 함수형 wrapper로 충분, 클래스 오버헤드 |

---

## 2. 결정점

### D1 — `GameMode` 후보
- **(A 추천)** Phase 1은 `'default'` **단일 모드만** 정식 구현. enum 에 `'review-queue'|'time-attack'|'deep-recall'` 타입은 선언 (확장 포인트 명시) 하되, `resolveRating` 은 default 외 throw `not-implemented` (또는 default fallback).
- (B) Phase 1에서 4 모드 전체 rating 규칙 정의 + 구현. plan 폭 ↑, 미사용 코드 ↑.

→ A 채택 (결단력·하이퍼캐주얼 — Phase 1 최소).

### D2 — `ReviewOutcome` shape
- **(A 추천)** `{ correct, wrongCount, hintUsed, elapsedMs? }`. 21 게임 현 호출처 신호 합집합. `elapsedMs?` 는 time-attack 모드 진입 시점에 채워짐 (default 모드에서는 undefined OK).
- (B) `{ correct, signals: Record<string, unknown> }` — 더 유연하나 타입 안전성 ↓.

→ A 채택.

### D3 — wrapper 위치
- **(A 추천)** `src/lib/core/fsrs/modes/index.ts` 신규 폴더. fsrs/index.ts 본체는 알고리즘 wrapper 책임, modes/index.ts 는 모드 결정 책임.
- (B) `src/lib/core/fsrs/index.ts` 확장. 단일 파일, 책임 혼재.

→ A 채택. fsrs/index.ts → barrel `export * from './modes'` 추가.

### D4 — default 모드 rating 규칙 (위 표 표준화)
- **(A 추천)** Typing 메커닉 패턴을 표준 채택. Phase 1 §1.1에서 21 게임 분포 grep으로 검증, 미세 차이는 분포 표 정리 후 Phase 2 보강 항목으로 이관.
- (B) 메커니즘별 별 규칙 보존 (BlankRule/TypingRule/...) — wrapper 의미 약화.

→ A 채택.

### D5 — ts-fsrs 알고리즘 업그레이드
- (A 배제 — 원 추천이었으나 §1 합의에서 뒤집힘) ts-fsrs 4.7.1 유지. 알고리즘은 별 plan.
- **(B 채택)** **ts-fsrs 5.3.3 (FSRS-6)** 으로 동시 업그레이드. **Phase 0 (마이그레이션)** 단계로 모드 wrapper Phase 1 진입 *전*에 분리.
  - **이유**: 사용자 §1 합의. 메모리 룰 *단일 백본* — 알고리즘 + 모드 wrapper 모두 백본 1회 정비로 끝내고 V0.4 이후 안정 가동.
  - **회귀 분리**: Phase 0 (알고리즘만) ↔ Phase 1 (모드 wrapper만) ↔ Phase 2~3 (호출처 마이그레이션) — 각각 별 PR로 분리해 회귀 원인 추적 가능.
- (C 배제) FSRS-5 (ts-fsrs 미공식) — ts-fsrs 5.x는 이미 **FSRS-6** 구현. 별도 5 단계 없음.

**Breaking changes (ts-fsrs v5.0.0 — 2025-05-12)**:
1. 알고리즘 FSRS-4.5 → **FSRS-6**.
2. `Card`·`Revlog` 인터페이스에 **`learning_steps` 필드 추가** → 기존 localStorage 직렬화 호환성 처리 필요 (Phase 0 §0.1).
3. `FSRSParameters` 에 `learning_steps`·`relearning_steps` 추가 — backward compat default 가능.
4. `engines: node >= 20.0.0` — 현 환경 OK (확인됨).

---

## 3. 작업 항목

### Phase 0 — ts-fsrs 4.7.1 → 5.3.3 알고리즘 마이그레이션 (PR #N2a)
- [ ] `package.json` 의존성 `ts-fsrs ^4.0.0` → `ts-fsrs ^5.3.3` 업데이트 + `bun install`.
- [ ] `src/lib/core/fsrs/index.ts` — `learning_steps` 새 필드 영향 검토. `generatorParameters()` 호출은 그대로(v5에서 새 파라미터 default 채움). `fsrsInstance.next(card, now, rating)` API 시그니처 v5 호환 확인.
- [ ] `src/lib/core/storage/srs.ts` — `deserialize()` 에서 기존 localStorage 카드에 `learning_steps` 누락 시 default 0 (또는 빈 배열) fallback.
- [ ] `src/lib/core/fsrs/index.test.ts` — 기존 case 회귀 점검, FSRS-6 산정 결과로 expected 값 갱신(due Date 비교는 ms tolerance 도입 가능).
- [ ] `bun run typecheck` PASS.
- [ ] `bun run test` 회귀 0 (필요 시 expected 갱신).
- [ ] `bun run test:e2e` 161/161 회귀 0 (e2e는 rating 흐름 검증, 알고리즘 산정 결과 의존 X).
- [ ] PR 생성·머지·`vercel --prod` (사용자 단계).

### Phase 1 — 모델·저장 (lib/core/fsrs/modes) — PR #N2b
- [ ] `src/lib/core/fsrs/modes/index.ts` 신규 — `GameMode` type + `ReviewOutcome` interface + `resolveRating` 순수 + `applyReview` 순수 + `applyAndPersist` I/O wrapper.
- [ ] `src/lib/core/fsrs/modes/index.test.ts` 신규 — 케이스 ≥ 10:
  - default 모드 4 rating 분기 (good/hard×2/again — wrongCount 0/1/≥2 + hintUsed) 
  - applyReview 순수성 (input mutate X)
  - applyAndPersist round-trip (load→apply→save)
  - 비-default 모드 (`'review-queue'` 등) — Phase 1 단계 not-implemented throw 또는 default fallback (D1에 따라)
  - elapsedMs default 모드에서 무시
- [ ] `src/lib/core/fsrs/index.ts` barrel — `export * from './modes'` 추가.
- [ ] typecheck + vitest 회귀 0 검증.
- [ ] e2e 161/161 회귀 0 검증 (호출처 미마이그레이션 단계라 변동 X).

### Phase 2 — 4 메커니즘 마이그레이션 (default 모드)
- [ ] TypingComponent — rating 결정 로직 제거, `applyAndPersist('default', gameId, cardId, { correct, wrongCount, hintUsed })` 호출.
- [ ] WordMatchComponent — 동일.
- [ ] BlankComponent — 동일.
- [ ] QuickQuizComponent — 동일.
- [ ] vitest + e2e 회귀 0 검증.

### Phase 3 — 13 개별 게임 마이그레이션 (default 모드)
- [ ] factorization·cloze-multi·english-word-match·physics-vector·chemistry-balance·english-order·bio-taxonomy·genetics-punnett·history-timeline·letter-assembly·korean-pos-tagging·math-graph-shift·image-hotspot — 각 컴포넌트에서 rating 결정 로직 제거 → applyAndPersist.
- [ ] outcome shape 차이(예: 일부 게임은 wrongCount 없음 → 0으로 normalize) 분포 표 작성, default 모드 규칙 적용 후 회귀 0 확인.
- [ ] vitest + e2e 회귀 0 검증.

### Phase 4 — 검증 + audit 갱신
- [ ] `bun run typecheck` PASS.
- [ ] `bun run test` 170+/170+ PASS.
- [ ] `bun run test:e2e` 161/161 회귀 0.
- [ ] `proc/audit/2026-05-18_games-catalog-audit-v3.md` 신규 (또는 v2 갱신) — 단일 백본 + 다중 모드 wrapper 완결 행 추가.
- [ ] 사용자 보고 + plan §1~§3 [x] 완결 → archive 이관.

---

## 4. 비스코프 (별 plan 트리거)

- **새 모드 구현** — `review-queue`/`time-attack`/`deep-recall` rating 규칙·UI 진입점 — V0.4+ 별 plan.
- **서버 백업 (Vercel KV)** — V2. fsrs/index.ts 주석 명시.
- **모드 selector UI** — V0.4+ 별 plan. 모드 선택 진입점.
- **모드별 dashboard stats** — V0.4+. 본 plan §3 Phase 3까지는 mode 호출만 통합, 집계 컬럼 추가는 별 트랙.

> 알고리즘 업그레이드는 §3 Phase 0 으로 본 plan 안에 통합 — 별 plan 아님 (§1 D5 합의).

---

## 5. 영향도

| 영역 | 변경 | 추정 LOC |
|---|---|---|
| `package.json` | ts-fsrs 4.7.1 → 5.3.3 | +1/-1 |
| `lib/core/fsrs/index.ts` | learning_steps 영향 검토 + (Phase 1) barrel 1줄 | ≈+5 |
| `lib/core/storage/srs.ts` | deserialize fallback (learning_steps) | ≈+3 |
| `lib/core/fsrs/index.test.ts` | FSRS-6 결과로 expected 갱신 | ≈+10/-10 |
| `lib/core/fsrs/modes/` (Phase 1) | 신규 폴더 + index.ts + test | ≈80 + 90 |
| 4 메커니즘 컴포넌트 (Phase 2) | rating 결정 로직 제거 + applyAndPersist | ≈-20 net |
| 13 개별 게임 컴포넌트 (Phase 3) | 동일 | ≈-30 net |
| e2e | 변동 X (호출처만 변경, 알고리즘 산정 결과 무관) | 0 |

→ Phase 0 ≈+15 LOC + test 갱신. Phase 1 ≈+170 LOC. Phase 2~3 누적 ≈-50 LOC.

---

## 6. 호출처 분포 검증 — Phase 1 §1.1 (사전 grep)

| 메커니즘/게임 | rating 결정 패턴 | default 규칙 일치 여부 |
|---|---|---|
| TypingComponent | hintUsed?'hard' : wc=0?'good' : wc=1?'hard' : 'again' | 표준 |
| (나머지 16 호출처) | Phase 2 진입 시 분포 표 갱신 | TBD |

→ Phase 2 진입 시 분포 표 채움. default 모드 규칙과 미세 차이 발생 시 Phase 2에서 보강.
