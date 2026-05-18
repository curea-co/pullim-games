# 2026-05-18 — audit v3 트리거 룰 + audit doc 양식 확장

- **상태**: ACCEPTED (2026-05-18) — §1·§2 사용자 합의 완료 → §3 Phase 1 PR 진입 중.
- **트리거**: audit v1(2026-05-14)·v2(2026-05-15) 매번 사용자 명시 요청으로 실행. 트리거 임계 부재 → 누가 언제 audit 돌릴지 합의 없음. 또한 audit v2가 "단일 백본 완결 행" 까지 기록 시작 — 양식이 결함 목록 외 아키텍처 진척 추적으로 확장 중 (메모리 룰 *단일 백본 + 다중 게임 모드*와 결).
- **연관 audit**: `proc/audit/2026-05-14_games-catalog-audit.md`, `proc/audit/2026-05-15_games-catalog-audit-v2.md`.
- **연관 plan**: `proc/plan/2026-05-18_fsrs-backbone.md` (모드 wrapper Phase 2~3 도입 후 양식 갱신 트리거).

---

## 0. 현 상태 분석

### audit 현 실행 패턴 — 명시 요청만, 트리거 룰 부재 ❌
- v1 (2026-05-14): "audit 재실행" 사용자 요청 → 21 게임 review → 6 findings.
- v2 (2026-05-15): "design-audit 재실행" 사용자 요청 → findings 0 + 단일 백본 완결 행 추가.
- 두 실행 사이 임계 (PR N건 머지·신규 게임·신규 백본 등) 정의 없음. 누가 언제 audit 결정할지 컨벤션 부재.

### audit doc 양식 진화 — v2에서 "백본 완결 행" 추가 ✅
- v1 양식: 1.이전 issue 처리 → 2.신규 통합 회귀 → 3.변별력 정책 → 4.신규 finding → 5.다음 트랙 → 6.메트릭.
- v2 추가: 단일 백본(FSRS+스트릭) 완결 행. 아키텍처 차원 진척 추적.
- v3 후보: 모드 wrapper 채택률, ts-fsrs 알고리즘 버전, 마지막 production 배포 SHA·시점 등 — 본 plan §2 양식 확장 §B 정리.

### CONVENTION/spec 위치 — audit 룰 미정의 ❌
- `~/dev_git/.pullim-meta/CONVENTION.md` §3 daily_outcome 양식 정의는 있으나 audit 트리거 룰 부재.
- `proc/spec/01~10` 어디에도 audit 정기 감사 룰 부재. 메모리 룰 *단일 백본*과 결을 맞춰 신규 정의 필요.

---

## 1. 추천 — 트리거 조건 7건 + 양식 확장 5건 + CONVENTION 1줄 반영

### A. audit 트리거 조건 후보 (7건)

| # | 트리거 | 임계 | 비고 |
|---|---|---|---|
| T1 | **신규 게임 추가** | 1건 머지 즉시 | registry 자동 갱신 + audit 1 row 추가 |
| T2 | **신규 메커니즘 컴포넌트 추가** | 1건 (현 4 → 5) | 메커니즘은 21 게임 공유 — 영향도 큼 |
| T3 | **단일 백본 변경** | 1건 (FSRS·streak·새 백본 추가/변경) | 메모리 룰 *단일 백본 + 다중 모드* — 백본 변경은 즉시 audit |
| T4 | **공통 컴포넌트 시그니처 변경** | 1건 | `game-shell/game-mechanics` props/return shape — 21 게임 회귀 위험 |
| T5 | **메이저 의존성 업그레이드** | 1건 | ts-fsrs/framer-motion/next major bump — 오늘 4.7→5.3 같은 케이스 |
| T6 | **N건 머지 누적** | 5건 머지 시 | 작은 변경 누적도 카탈로그 차원 점검 — 주 1~2회 cadence 자연 형성 |
| T7 | **변별력/checkAnswer 등 핵심 로직 변경** | 1건 | factorization·rating 규칙 등 학습 효과 영향 |

→ T1·T3·T5·T7 은 **HARD** 트리거 (즉시 audit), T2·T4·T6 는 **SOFT** 트리거 (다음 일일 outcome에서 audit 항목 추가).

### B. audit doc 양식 확장 항목 (5건)

| # | 항목 | v2 유무 | 의도 |
|---|---|---|---|
| F1 | **백본 완결 행** | ✅ v2 추가 | 백본별 상태(완결/진행/미진입) — v3에서 표 형식 표준화 |
| F2 | **아키텍처 진척 컬럼** | ❌ 신규 | 모드 wrapper 채택률·단일 백본 수·다중 모드 수 |
| F3 | **알고리즘/의존성 버전** | ❌ 신규 | ts-fsrs 버전 + FSRS 알고리즘 (FSRS-4.5/4.6/6/SM-2) 명시 |
| F4 | **마지막 production 배포 동기화** | ❌ 신규 | 머지 SHA ≠ production 배포 SHA — 오늘 5일 뒤처짐 케이스 |
| F5 | **변별력 정책 행** | ✅ v1·v2 유지 | 21/21 + 별 plan 진행 행 |

### C. 룰 반영 단위

| 단위 | 위치 | 작업 폭 | 권위 |
|---|---|---|---|
| **(A 추천)** CONVENTION 1줄 추가 | `~/dev_git/.pullim-meta/CONVENTION.md` §3 또는 §신규 | 짧음 — 1줄~3줄 | 4 풀림 공통 운영 규칙 (audit는 games 만 — `games-only` 명시) |
| (B) `proc/spec/audit-trigger.md` 신설 | games proc/spec/ | 큼 — 정식 spec | games 권위 문서 정착 패턴 |

→ 메모리 룰 *결단력*에 따른 1순위: **A — CONVENTION 1줄 추가**. games 도메인 한정 룰임을 명시. spec 신설은 V0.4+ 트랙으로 분리 (작업 폭 ↑, 권위 vs 시급성 trade-off).

---

## 2. 결정점

### D1 — 트리거 조건 채택 범위
- **(A 추천)** 7건 모두 채택. HARD/SOFT 구분으로 강도 분리.
- (B) HARD 4건만 (T1·T3·T5·T7) — SOFT 트리거 누락 → 작은 변경 누적 점검 책임 모호.
- (C) T6 만 (N건 머지) — 가장 단순하나 신규 게임 즉시 점검 누락.

→ A 채택.

### D2 — 양식 확장 항목 채택 범위
- **(A 추천)** F1~F5 모두 채택. 다음 audit v3 산출 시 F2~F4 신규 컬럼 채움.
- (B) F1·F5 만 — v2 양식 유지. F2~F4 신규는 별 plan.

→ A 채택. 한 번에 양식 정착.

### D3 — 룰 반영 단위 (CONVENTION vs spec)
- **(A 추천)** CONVENTION 1줄 (메모리 룰 *결단력* + plan §블로커 "최소 반영").
- (B) spec 신설 — V0.4+ 트랙 분리.

→ A 채택. 본 plan §3 Phase 2에서 CONVENTION 갱신 PR.

### D4 — 트리거 강도 (HARD/SOFT)
- **(A 추천)** HARD (T1·T3·T5·T7) = "다음 일일 outcome에 audit 작성 항목 포함". SOFT (T2·T4·T6) = "최근 audit 이후 N건 SOFT 누적 시 HARD 승격".
- (B) 모두 HARD — 작업 폭 ↑, fatigue.

→ A 채택.

### D5 — audit 산출자 (누가 audit 작성)
- **(A 추천)** AI가 트리거 감지 + 초안 작성 → 사용자 검수 + 머지. 메모리 룰 *문서화 먼저, 코드는 그 다음*에 부합.
- (B) 사용자 작성 — fatigue ↑, 미실행 위험.

→ A 채택.

---

## 3. 작업 항목

### Phase 1 — CONVENTION + CLAUDE.md 룰 반영 PR
- [x] `~/dev_git/.pullim-meta/CONVENTION.md` §7 "audit 정기 감사 트리거 룰 (games 한정)" 추가 — HARD 4건 + SOFT 3건 + 산출자 + audit doc 양식 §7.4. 본 파일 git-untracked → 직접 수정 (PR 단위 X).
- [x] `pullim-games/CLAUDE.md` §6 audit 행에 "audit 트리거 룰·doc 양식은 CONVENTION §7 참조 (games 한정)" 1줄 추가.
- [ ] CLAUDE.md 변경 PR 머지 (CONVENTION.md 변경은 untracked 직접 반영).

### Phase 2 — audit v3 doc 양식 확장 (다음 audit 트리거 시)
- [ ] `proc/audit/YYYY-MM-DD_games-catalog-audit-v3.md` 양식:
  - §1 이전 issue 처리 (v1·v2 유지)
  - §2 신규 통합 회귀 점검 (v1·v2 유지)
  - §3 변별력 정책 (v1·v2 유지)
  - §4 **신규 — 단일 백본 진척 표** (백본별 상태 + 모드 wrapper 채택률)
  - §5 **신규 — 알고리즘/의존성 버전 행** (ts-fsrs 버전 + FSRS 알고리즘)
  - §6 **신규 — production 동기화 행** (마지막 배포 SHA·시점)
  - §7 신규 finding (v1·v2 유지)
  - §8 다음 트랙 (v1·v2 유지)
- [ ] 본 plan에서는 양식만 정의 — 실제 v3 audit 산출은 다음 audit 트리거 시점에 본 plan §3 양식 따라 작성.

### Phase 3 — 검증
- [ ] CONVENTION 갱신 후 본 plan §1.A 트리거 7건 + §1.B 양식 5건이 §1.A 기준으로 자가 추적 가능한지 확인.
- [ ] 메모리 (feedback_plan_workflow) 패턴 적용 — 머지 후 본 plan §3 [x] 자가 검증.
- [ ] 본 plan → `proc/archive/plan/2026-05-18_audit-trigger-rules.md` 이관.

---

## 4. 비스코프 (별 plan 트리거)

- **`proc/spec/audit-trigger.md` 신설** — V0.4+ 별 plan. games 권위 spec 정착 트랙.
- **audit 자동화 스크립트** — `bun run audit` 스크립트로 트리거 조건 자동 감지 + 초안 생성. 본 plan은 룰 정의만, 자동화는 별 plan.
- **audit v3 산출 실행** — 본 plan §3 Phase 2 양식 따라 별 트리거 시점에 작성.

---

## 5. 영향도

| 영역 | 변경 | 추정 LOC |
|---|---|---|
| `~/dev_git/.pullim-meta/CONVENTION.md` | §4 신규 (audit 트리거 룰 — games 한정) | ≈15 |
| `pullim-games/CLAUDE.md` | §6 proc 구조 행에 1줄 추가 | +1 |
| 코드 변경 | X (문서만) | 0 |

→ 작업 폭 매우 작음. 메모리 룰 *문서화 먼저, 코드는 그 다음*에 부합 — 룰 정착 후 자동화는 후행.
