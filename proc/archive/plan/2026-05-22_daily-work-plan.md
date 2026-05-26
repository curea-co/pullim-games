# 2026-05-22 — Daily Work Plan (오늘자 daily_outcome 통합)

- **상태**: DRAFT — AI 단독 가능 트랙 (T-A, T-B) 진행 / 사용자 액션 트랙 (T-C, T-D, T-E) 추천만 첨부
- **트리거**: `daily_outcome/2026-05-22.md` 09:30 약속 5건 + 어제 17:30 잔존 이월 (audit v5 4일 연속 이월 최우선)
- **현재 git 상태 정합화 (`gh pr list` 기준 2026-05-22)**:
  - PR #91 OPEN — Plan D Phase 1+2 (V2 결제 spec + Resend 알림 백엔드, Codex round 5 정착)
  - PR #92 OPEN — Plan E Phase 3+4+5 (time-attack 타이머 + deep-recall 필터 + 진입점)
  - PR #93 OPEN — Plan G Phase 1.7 follow-up (spec/01 §3 정합화)
  - PR #94 OPEN — Plan G Phase 1.8 follow-up (PII vs V1.5 알림 정합화)
  - PR #97 MERGED 2026-05-21 — self-hosted runner pullim-games 전용 group 라우팅
  → 오늘 daily_outcome 의 "Plan D Phase 1 미진입"·"Plan E Phase 3 미진입" 표현은 사전 PR 인지 부재. **실제로는 PR #91·#92 가 코드 완료, 사용자 검토·합의·머지만 남음.**
- **메모리 룰**:
  - **문서화 먼저** (feedback_docs_first) — 본 plan 작성 후 코드
  - **결단력 있게 실행, 갈래 묻지 말 것** (feedback_decisive_execution) — 사용자 합의 의무 항목은 1순위 추천만 첨부
  - **다른 세션 브랜치 자동 수정 금지** (CONVENTION §6) — PR #91·#92·#93·#94 브랜치 본 세션 비건드

## 0. 오늘 약속 5건 → 본 plan 트랙 매핑

| 약속 (daily_outcome §2) | 본 plan 트랙 | 담당 | 상태 |
|---|---|---|---|
| audit v5 dry-run 메모 (`proc/audit/2026-05-22_v5-dry-run.md`) | **T-A** | AI | 진입 |
| Plan G Phase 3 AGENTS.md 보강 PR | **T-B** | AI | 진입 |
| Plan D 결정점 합의 1건 | **T-C** | 사용자 합의 | AI 추천 첨부 |
| Plan E Phase 3 D1.3·D1.4 합의 | **T-D** | 사용자 합의 | AI 추천 첨부 (PR #92 결정값 사후 추인) |
| `vercel --prod` 수동 배포 (PR #84~#97 합산) | **T-E** | 사용자 액션 | 알림 |

## 1. 트랙 별 세부 — AI 단독 진행

### T-A — audit v5 dry-run (최우선, 4일 이월)

- **목적**: CONVENTION §7 트리거 (HARD T1/T3/T5/T7, SOFT 5건 누적) 도달 여부 판정. v4 (2026-05-19) 이후 변동분 dry-run.
- **산출**: `proc/audit/2026-05-22_v5-dry-run.md` — 임계점 도달/미도달 1줄 판정 + v4 이후 변동 점검
- **트리거 사전 분석** (이 항목이 그대로 audit dry-run 본문 §2 신규 finding 으로 이관):
  - **T6 (SOFT, 5건 누적)** — v4 (PR #81) 이후 머지: #82·#84·#85·#86·#87·#89·#90·#97 = **8건** → 임계점 초과
  - **T4 (SOFT, 공통 컴포넌트 시그니처 변경)** — PR #85 가 4 메커니즘 `applyAndPersist(mode, ...)` + `selectCardsForMode(withSrs, mode, ...)` 호출처 16개 시그니처 변경. SOFT 카운트 1
  - **T3 (HARD, 단일 백본 변경)** — PR #81 modes 비-default rating 정식. v4 §3 표 5/5 갱신 이미 반영 → 신규 트리거 아님
  - **T7 (HARD, rating 로직 변경)** — PR #92 `resolveRating('time-attack')` `elapsedMs` 의존 신설 → 머지 시 HARD 발동. 본 dry-run 시점 OPEN → "PR #92 머지 시 즉시 audit v5 본 doc 작성 의무" 명시
  - **CI 인프라 변화 (v4 §6 production 동기화 행 대응)** — PR #87 codex-review.yml + #90 e2e-nightly.yml + #97 runner-group 라우팅 = 3건. v4 §7 informational "CI 정착도" 트랙 진척.
- **판정 logic**: T6 (8건) + T4 (SOFT 1) 합산으로 SOFT 임계점 (5건) **이미 도달** → **dry-run 단계에서 audit v5 본 doc 정식 작성 필요**. 본 doc 정식화는 별 PR (오늘 작성 시간 부족 시 내일).
- **본 dry-run 산출 한계 (정직한 trade-off)**:
  - PR #91·#92 OPEN 상태 — 머지 전 백본 영향 평가는 잠정값 (머지 시 별 audit doc 갱신 의무)
  - production 동기화 행 (CONVENTION §7.4 §6) — 마지막 vercel 수동 배포 SHA 확인 필요 (사용자 액션 의존)
- **검증**: audit doc 1개 신설 + commit (별 PR 없이 직접 main push 가능 — doc-only)
- **약속 매핑**: daily_outcome §3 완료 기준 1번 ("임계점 도달/미도달 판정 1줄") 충족

### T-B — Plan G Phase 3 AGENTS.md 보강 (인프라 의존 0)

- **목적**: Plan G §Phase 3 체크리스트 종결. 현 AGENTS.md 13줄 → 충실한 룰
- **산출 항목** (Plan G §3 Phase 3 명시):
  1. 단일 백본 + 다중 게임 모드 아키텍처 (메모리 룰 `project_architecture_decision`)
  2. 4 메커니즘 컴포넌트 (`QuickQuiz`·`Blank`·`Typing`·`WordMatch`) — 직접 게임 컴포넌트 작성 금지 룰
  3. 디자인 토큰 (`text-pullim-slate-{...}`·`bg-pullim-blue-{...}`·`accent-positive`·`accent-negative`·`type-secondary` 등) — 미정의 토큰 silent fallback 경고
  4. 하이퍼캐주얼 룰 (RPG·시즌·랭킹 금지)
  5. viewport 320·390·768·1280 4 audit 의무 (`bun run ui:audit <path>`)
  6. CLAUDE.md / `proc/spec/01~10` 권위 문서 참조
- **현 AGENTS.md 유지 항목**:
  - Next.js 권위 문서 분기 (`<!-- BEGIN/END:nextjs-agent-rules -->`)
  - AI 검증 거버넌스 요약 (PR #89 정착분)
- **검증**:
  - `bunx tsc --noEmit && bun run lint` (docs only — 영향 0이지만 컨벤션상 필수)
  - PR 본문에 4 viewport audit 의무 면제 사유 명시 (docs only, UI 영향 0)
- **PR**: `chore: AGENTS.md 보강 — Plan G Phase 3 (단일 백본·4 메커니즘·디자인 토큰·하이퍼캐주얼·viewport·CLAUDE.md 참조)` → main 머지
- **약속 매핑**: daily_outcome §3 완료 기준 2번 (PR #N 머지 + AGENTS.md 보강 항목 추가 확인)

## 2. 트랙 별 세부 — 사용자 합의 의무 (AI 추천 첨부)

### T-C — Plan D 결정점 합의 1건 (PR #91 검토 후)

- **현 PR #91 본문 매트릭스** (이미 1순위 권장값 첨부 상태):
  - D1 V2 출시 시점: 권장 (B) **2026 Q4**
  - D2 가격 모델: 권장 (D) **Freemium**
  - D3 무료/유료 기능: 권장 **학습효과 잠금 X** (광고 제거·custom 무제한·클라우드 동기화 잠금)
  - D4 가격대: 권장 (B) **9,900원/월**
  - D6 환불 정책: 권장 (B) **14일 무조건 환불**
  - D7 학생 할인·체험판: D2 연동 (Freemium 시 별도 무료 평가판 불요)
- **오늘 합의 가능 1건 1순위 추천**:
  - **D1 (V2 출시 시점)** — 다른 결정점의 시간축 기준값. 합의 비용 가장 낮음 (단일 날짜 선택). 합의 후 D2·D3·D4·D6 일정 역산 가능.
  - 사유: D1 부재 시 D2 (가격 모델)·D4 (가격대) 도 일정 압박 모름 → 의사결정 정보 부족
- **합의 후 처리**: PR #91 본문 매트릭스 갱신 + plan-d-v2 본문 D1 [x] + 합의 날짜 2026-05-22 메모
- **약속 매핑**: daily_outcome §3 완료 기준 3번

### T-D — Plan E Phase 3 D1.3·D1.4 합의 (PR #92 결정값 사후 추인)

- **현 PR #92 구현 채택값**:
  - D1.3 타이머 단위: **30초/카드** (PR #92 `TimeAttackTimer` default)
  - D1.4 시간 초과 페널티: **`again` 강제** (PR #92 `handleTimeout()` `elapsedMs=30_001` → `resolveRating('time-attack')` → `again`)
- **AI 추천 (학습효과 우선)**:
  - D1.3: **30초/카드** — 카드별 독립 타이머는 메커니즘 컴포넌트와 1:1 매핑 가장 단순. 세션/5문제 단위는 카드별 흐름 끊김
  - D1.4: **`again` 강제** — 시간 초과 = 재학습 신호로 FSRS 가 자연스럽게 처리. default 패턴 fallback 은 학습 신호 흐림
  - 사유: PR #92 가 이미 두 값 모두 1순위 추천대로 구현 → 사후 추인 합의가 자연스러움
- **합의 후 처리**: plan-e §3 Phase 3 [x] + D1.3·D1.4 합의 날짜 2026-05-22 메모 + PR #92 머지 진행
- **약속 매핑**: daily_outcome §3 완료 기준 4번

### T-E — vercel --prod 수동 배포 (PR #84~#97 합산)

- **대상**: PR #84·#85·#86·#87·#89·#90·#97 = 7건 main 머지분 production 미반영
- **명령**: `bunx vercel --prod` (CONVENTION §5)
- **검증**: vercel deployment ID 또는 production URL 정상 접속 확인 (사용자 본인 액션)
- **약속 매핑**: daily_outcome §3 완료 기준 5번

## 3. 작업 항목

### Phase 1 — AI 단독 (오늘 즉시)
- [ ] T-A: `proc/audit/2026-05-22_v5-dry-run.md` 신설 + 임계점 판정 + main 직접 commit (doc-only)
- [ ] T-B: 신규 branch `chore/plan-g-phase3-agents-md` → AGENTS.md 보강 → `bunx tsc --noEmit && bun run lint` → push → PR

### Phase 2 — 사용자 합의 의무 (오늘 14:30 이후)
- [ ] T-C: PR #91 매트릭스 검토 → D1 합의 1건 → plan-d 메모
- [ ] T-D: PR #92 D1.3·D1.4 사후 추인 → plan-e 메모 → PR #92 머지

### Phase 3 — 사용자 액션 (T-B·T-C·T-D 정리 후)
- [ ] T-E: `bunx vercel --prod` 수동 배포 + deployment ID 확인

## 4. 비스코프

- PR #91·#92·#93·#94 브랜치 코드 수정 — 다른 세션 작업 (CONVENTION §6). 본 세션은 plan 본문 메모 추가만.
- audit v5 본 doc 정식 작성 — T-A dry-run 결과 임계점 도달 시 별 PR (오늘 시간 부족 시 내일)
- 24 icon 시안 — 사용자 본인 트랙, AI 비스코프 (5일 이월)
- Plan E Phase 5 12 직접 게임 통합 — PR #92 본문 §"잔존 결정점" — 별 trigger

## 5. 영향도

| 트랙 | 변경 | LOC | 리스크 |
|---|---|---|---|
| T-A | `proc/audit/2026-05-22_v5-dry-run.md` 신설 | ≈+100 | 0 (doc-only) |
| T-B | `AGENTS.md` 보강 | ≈+80 | 0 (docs only — code 영향 없음) |
| T-C·T-D | `proc/plan/2026-05-19_plan-d-v2-*.md` + `proc/plan/2026-05-19_plan-e-*.md` 본문 메모 | ≈+20 | 0 |
| T-E | 외부 액션 (vercel CLI) | 0 | production 반영 — 사용자 액션 |

→ 총 ≈+200 LOC docs. **인프라 의존 0**, 코드 영향 0.

## 6. 사용자 의사결정 의무 사항

- **G1·G3·G4 합의 필요 (T-C·T-D)**: Plan D D1 1순위 추천 (2026 Q4) + Plan E D1.3·D1.4 사후 추인
- **사용자 본인 액션 (T-E)**: `bunx vercel --prod`
- **AI 단독 진입 가능 (T-A·T-B)**: 본 plan 합의 직후 즉시 진행
