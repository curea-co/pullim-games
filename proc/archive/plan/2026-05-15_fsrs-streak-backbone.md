# 2026-05-15 — FSRS·스트릭 백본 (단일 백본 + 다중 모드)

- **상태**: COMPLETE (2026-05-15) — Phase 1~6 모두 머지 완료. 단일 백본 (FSRS + 스트릭) 마지막 한 조각 완결.
- **트리거**: 메모리 룰 *단일 백본 + 다중 게임 모드*. FSRS 통합은 완료(`src/lib/core/fsrs/`), 스트릭 인프라는 부재 → 백본 마지막 미스 보강.
- **메모리 룰**: 하이퍼캐주얼 유지, RPG 금지 (배지·시즌·보스레이드 X). 단일 카운터만.
- **연관 audit**: `proc/audit/2026-05-15_games-catalog-audit-v2.md` (코드 차원 finding 0, 백본 강화 별 트랙).

---

## 0. 현 상태 분석

### FSRS — 통합 완료 ✅
- `src/lib/core/fsrs/` — `createInitialState`, `reviewCard(prev, rating)` 등 ts-fsrs 래퍼.
- `src/lib/core/storage/srs.ts` — `loadSrsState`/`saveSrsState`/`loadAllSrsStates` localStorage 영속.
- 21 게임 모두 정답/오답 시점에 `reviewCard` 호출 + `saveSrsState` 영속.
- `src/lib/core/dashboard/stats.ts` — `computeDashboardStats` 가 모든 게임 SRS 상태 집계, `dueSoonCount` / `todayAttempts` / 정확도 등 노출.

### 스트릭 — 인프라 부재 ❌
- `grep -r "streak\|연속" src/` → 0 매치 (이전 audit 행과 README 외 게임 코드 무관).
- 일일 학습 연속 카운터 없음. 사용자가 "어제 풀었는데 오늘 또 풀어야지" 동기를 시각 신호 없이 유지해야 함.

→ 스트릭 카운터 추가가 백본 마지막 한 조각.

---

## 1. 추천 메커닉 — 단일 일일 스트릭 카운터

학생 흐름:
1. 매번 카드 학습(정답/오답 무관) → `recordActivity(now)` 호출.
2. `recordActivity` 가 오늘 첫 활동이면 streak 갱신:
   - lastActiveDate 가 어제 → `current += 1`
   - lastActiveDate 가 2일+ 전 또는 없음 → `current = 1` (리셋)
   - lastActiveDate 가 오늘 → no-op
3. 홈 dashboard 에 "🔥 N일 연속" (혹은 텍스트만 — D3 결정) 표시.

### 갈래 분석 (검토 후 배제)

| 안 | 메커닉 | 채택 여부 | 근거 |
|---|---|---|---|
| A | 카드별 SRS state 와 묶어 저장 | 배제 | 카드 단위 X 사용자 단위. 책임 분리 필요 |
| B | 서버 백업 (Vercel KV) 우선 | 배제 | V1 비로그인 fingerprint 단위 (SPEC §05.5) — localStorage 우선 |
| **C** | **localStorage 단일 키 (`pullim-games:streak`)** | **채택** | SRS 와 동일 fingerprint 단위, 비로그인 OK |
| D | 게임별 스트릭 분리 | 배제 | 단일 백본 룰 위반. 21 게임 합쳐 1 카운터 |
| E | 이벤트 로그 (`/api/event`) 기반 후산정 | 배제 | 서버 의존 + silent fail → 클라이언트 즉시 표시 불가 |

---

## 2. 결정점

### D1 — 날짜 경계
- **(A 추천)** 로컬 자정 기준 (`new Date()` `getFullYear/Month/Date`). 사용자가 "오늘 풀었나" 직관에 부합.
- (B) UTC 자정. 서버 정합성 좋지만 한국 사용자에게 부자연스러움.
- (C) 마지막 활동으로부터 24h. "어제 23:50 + 오늘 00:10" 같은 경계 케이스가 끊기지 않지만 학생 멘탈 모델과 어긋남.

→ A 채택.

### D2 — 저장 형식
- **(A 추천)** localStorage `pullim-games:streak` 단일 키, JSON `{ current, longest, lastActiveDate }`.
- (B) 날짜 배열로 저장 (히트맵용). V0.4 히트맵 도입 시 마이그레이션.

→ A 채택 (단순). 히트맵 도입 시 별 키 (`pullim-games:streak-history`) 추가.

### D3 — UI 표시 위치·톤
- **(A 추천)** 홈 dashboard 상단 (또는 stats 카드 안) — "🔥 N일 연속" 또는 "{N}일 연속 학습 중". 폭죽·사운드 X (하이퍼캐주얼 톤).
- (B) 게임 페이지 헤더에도 동시 노출. 학생 학습 중 방해 가능 → 배제.

→ A 채택. 정확한 컴포넌트 위치는 Phase 3 단계에서 dashboard 코드 확인 후 결정.

### D4 — 갱신 hook 위치
- **(A 추천)** `recordActivity()` helper 함수. 게임 컴포넌트에서 `saveSrsState` 직후 명시 호출.
- (B) `saveSrsState` 내부에서 자동 호출. 결합도 ↑.
- (C) `reviewCard` 내부. 순수 함수 책임 위반.

→ A 채택. 21 게임 컴포넌트에서 1줄 추가 (`recordActivity()`).

### D5 — 리셋 정책
- **(A 추천)** lastActiveDate 가 2일 이상 전이면 current = 1. longest 는 보존.
- (B) "그레이스 1일" — 하루 빠져도 current 유지. UX 친화적이지만 하이퍼캐주얼 룰엔 과함.

→ A 채택 (단순).

---

## 3. 작업 항목

### Phase 1 — 모델·저장 (lib/core) ✅ (PR #52)
- [x] `src/lib/core/streak/index.ts` — `StreakState { current, longest, lastActiveDate }` + `createInitialStreak()` + `recordActivity(prev, now)` 순수 + `loadStreak()/saveStreak()` localStorage I/O + `recordActivityAndSave()` wrapper.
- [x] `src/lib/core/streak/index.test.ts` — 13 케이스 (순수 8: 첫/no-op/+1/longest/2일/일주일/월·연 경계, IO 5: load/save round-trip/wrapper/malformed).
- [x] `src/lib/core/index.ts` barrel export.

### Phase 2 — dashboard stats 통합 ✅
- [x] `DashboardStats` 에 `streak: StreakState` 추가.
- [x] `computeDashboardStats` 가 `loadStreak()` 호출 + 반환에 포함.

### Phase 3 — UI 표시 ✅
- [x] 홈 dashboard header — "{N}개 게임을 만났어요 · M일 연속" (M >= 2 일 때만 dot-separator 노출).
- [x] streak.current === 1 은 노출 X (2일 연속부터). 0은 N/A.
- [x] 이모지·강조 색상 X — 메모리 룰 *하이퍼캐주얼 유지, 외재 보상 회피* 부합.

### Phase 4 — 게임 통합 (17 호출처) ✅
- [x] `saveSrsAndRecord(gameId, cardId, state)` wrapper 신설 (lib/core/storage/srs.ts) — 메모리 룰 *결단력* 채택.
- [x] 17 호출처 일괄 마이그레이션 (sed) — 4 메커니즘 (Typing/WordMatch/Blank/QuickQuiz) + 13 개별 게임 (factorization, cloze-multi, english-word-match, physics-vector, chemistry-balance, english-order, bio-taxonomy, genetics-punnett, history-timeline, letter-assembly, korean-pos-tagging, math-graph-shift, image-hotspot).

### Phase 5 — 검증 ✅
- [x] vitest — Phase 1 streak 13 케이스 (PR #52 머지분).
- [x] e2e — `e2e/streak.spec.ts` 신규 2 spec:
  - vocab-typing 정답 후 `pullim-games:streak.current === 1` localStorage 검증
  - 홈 진입 시 `current >= 2` 셋업 → "N일 연속" 노출 검증
- [x] `bun run typecheck` PASS.
- [x] `bun run test` 170/170 PASS.
- [x] `bun run test:e2e` 161/161 PASS (159 → 161, +2 streak, 회귀 0).

### Phase 6 — 머지 + 자가 검증 + 보고 ✅
- [x] commit + PR + main 머지 (본 PR Phase 2~6 통합).
- [x] audit v2 갱신 — 단일 백본 ✅ 완결 행 추가.
- [x] 사용자 보고.

---

## 4. 비스코프

- **배지** — 단일 백본 + 하이퍼캐주얼 룰. 시즌·뱃지·트로피 X.
- **시즌·이벤트** — RPG 확장 금지.
- **그레이스 기간** — D5.B 배제.
- **히트맵** — V0.4+ 별 plan (streak-history 키).
- **서버 백업 (Vercel KV)** — V2.
- **알림 푸시** — 별 plan, PWA push 필요.

---

## 5. 영향도

| 영역 | 변경 |
|---|---|
| lib/core/streak | 신규 (≈80 LOC + test 60 LOC) |
| lib/core/dashboard | DashboardStats 에 streak 추가 (≈10 LOC) |
| 21 게임 컴포넌트 | `saveSrsState` wrapper 채택 시 21 곳 마이그레이션. 미채택 시 1줄 추가 × 21 = 21 줄 |
| home dashboard UI | streak 표시 1 곳 (≈20 LOC) |
| e2e | 신규 spec 1 (≈30 LOC) |
| 메모리 룰 | "단일 백본" 마지막 한 조각 완결, "하이퍼캐주얼" 보존 |

---

## 6. 위험 + 대응

- **위험 1**: 게임 21 곳 마이그레이션 누락 시 일부 게임에서 streak 카운트 안 됨.
  → wrapper helper 채택 + grep 으로 모든 `saveSrsState` 호출처 자동 확인.
- **위험 2**: 자정 직전 학습 → 자정 직후 학습 시 사용자 멘탈 "어제+오늘" 인데 lastActiveDate 비교 결과 "2일 연속". 의도 부합. (D1.A 의미).
- **위험 3**: 시간대 변경 (여행/DST) → 로컬 자정 기준이라 일부 day skip 가능. V1 비스코프 (V2 서버 정합성 시 처리).
- **위험 4**: localStorage clear 시 streak 리셋. 비로그인 한정 — V2 KV 백업 시 해결.

---

## 7. 합의 후 진입 단위

- 오늘 진입 가능: Phase 1 (모델·저장 + test) — 작업 단위 작음, 머지까지 1시간 단위.
- 내일 이월 권장: Phase 2~6 — dashboard UI + 21 게임 통합은 별 작업.

→ 본 plan 합의 후 Phase 1 단독 PR 진입이 현실 목표.
