# 2026-05-20 — Plan G Phase 1.7: proc/spec/01 §3 권위 정합화 (follow-up)

- **상태**: PROPOSAL (2026-05-27) — D1 추천안 A (본 리포 한정 분기 룰 신설) **G1 승인** (2026-05-27 사용자 명시 결정). D2 G3·G4 합의는 별 채널·후속 진행. CLAUDE.md §4 "권위 문서 수정 G1/G3/G4 합의" 룰을 본 plan 안에서 "G1 단독 = G3·G4 대리" 예외로 우회하지 않는다 (codex #105 round 5 지적). 본 PR #105 의 scope = **본 plan 문서 자체만 추가** — `proc/spec/01-AI-명령지침.md §3`, `proc/spec/09-기술-환경.md §9.1·§9.6`, `AGENTS.md` 본문 갱신은 **G3·G4 합의 완료 후 별 commit/PR 로 분리** (codex #105 round 6 지적: 합의 전 spec 본문 변경 머지 = 거버넌스 예외 선례 — 분리 머지가 정합).
- **트리거**: PR #89 의 Codex round 4 지적 — "AGENTS.md 에서 spec/01 §3 우회 선언은 충돌 해소가 아닌 우회". 진짜 해소 = spec/01 §3 자체 수정.
- **거버넌스 룰** (CLAUDE.md §9 — 2026-05-20 정착): 권위 문서(`proc/spec/01~10`) 수정은 §4 "사용자 명시 확인 후" 룰 — G1/G3/G4 합의 의무. PR #89 scope 초과로 별 PR 분리.
- **연관**: `proc/archive/plan/2026-05-20_plan-g-pullim-workflow-port.md` (PR #105 머지로 archive 이관 완료, 2026-05-26 main 반영). PR #105 머지 시 `AGENTS.md` 우회 선언 (spec/01 §3 본 리포 환경에서 적용 불가) 도 함께 제거 예정이었으나, **G3·G4 합의 보류로 scope 축소** (본 plan §3 작업항목의 spec/01 §3·spec/09 §9.1·§9.6·AGENTS.md 본문 갱신 항목 미수행) — `AGENTS.md` L4·L13 우회 선언은 현 main 에 잔존. 또한 본 PR #103 의 plan-g-port archive 이관에 따라 `AGENTS.md` L4·L13 의 본 plan-g-port 경로 참조도 별 PR 의 archive 경로 갱신 대상. 둘 다 D2 합의 완료 후 별 PR 로 정합화.

## 0. 현 상태

### A. spec/01 §3 의 룰

`proc/spec/01-AI-명령지침.md §3` 의 핵심 지시 — "Next.js 공식 docs 우선 읽기" 또는 유사 문구 (실제 정확 문구는 합의 시 점검). 본 리포의 Next.js 버전 = 15.5 (spec/09 §9.1 권위) — 표준 Next.js 컨벤션 채택.

### B. spec/09 §9.1 의 권위

`proc/spec/09-기술-환경.md §9.1` — Next.js 15.5 명시. AGENTS.md 의 "이건 너가 아는 Next.js 가 아니다" 류 boilerplate 가 spec/09 와 충돌.

### C. PR #89 round 3·4 우회 선언 (현 main 상태)

`AGENTS.md` 4·13 라인에 "spec/01 §3 의 Next.js docs 우선 지시는 본 리포 환경에서 적용 불가, spec/09 §9.1 권위" 우회 선언 박혀 있음.

→ 진짜 정합화 = spec/01 §3 자체 갱신해서 본 리포가 spec/09 §9.1 권위 따른다는 사실을 §3 안에 명시. **단, 본 갱신은 G3·G4 합의 완료 후 별 commit/PR.** 본 PR #105 는 plan 문서로 변경 방향만 합의 기록.

## 1. 추천 설계

### A. spec/01 §3 갱신 방향

옵션 매트릭스 (사용자 결정 후보 1개씩 — 결단력 룰):

| 옵션 | 변경 | 영향 |
|---|---|---|
| **(A 권고)** §3 의 "Next.js docs 우선" 룰 → "본 리포 Next.js 룰은 spec/09 §9.1 권위" 명시. 본 리포 한정 분기 룰 (다른 풀림 프로젝트 룰은 본 spec 의 source of truth 경계 밖) | games 리포 권위 문서에 분기 룰 신설 | spec/01 자체에 분기 — 깨끗 |
| (B) §3 완전 삭제 후 docs 우선 룰 자체 폐기 | 모든 풀림 프로젝트가 spec/09 류 권위 따름 | 큰 변경 — 다른 풀림 영향 |
| (C) AGENTS.md 우회 선언 유지 | 본 plan 0 작업 | 우회 잔존, 향후 PR 의 review 가 매 PR 우회 지적 가능 |

→ **(A) 채택 권고** — 본 리포 한정 분기 룰 신설, AGENTS.md 우회 선언 제거. **단 본 spec/01 §3 본문에 다른 풀림 프로젝트 (planner·Q·classbot) 운용 룰을 함께 적지 않는다** (codex #105 round 6 지적 #2: games spec 권위 문서에 타 프로젝트 룰까지 적으면 source of truth 경계 흐림. CLAUDE.md §7 "다른 풀림 프로젝트와의 관계" 표 참조 — 각 프로젝트 권위 문서가 다름).

### B. AGENTS.md 정리

- 우회 선언 제거 (spec/01 §3 갱신 후엔 충돌 0)
- "Next.js 15.5 — 권위 문서는 spec/09 §9.1" 단일 문장으로 정리

## 2. 결정점

### D1 — spec/01 §3 갱신 방향
- **(A 권고)** 본 리포 한정 분기 룰 신설
- (B) §3 완전 삭제 — 큰 변경
- (C) 우회 선언 유지 — 별 plan 마무리 X

→ A (G1 승인 2026-05-27).

### D2 — G1/G3/G4 합의 채널
- spec/01 은 4 풀림 공통이라 G1/G3/G4 모두 영향 가능. 본 리포 한정 분기면 영향 최소화. **G3·G4 합의는 별 채널 진행 중** — 합의 확보 후 §3 작업 항목의 spec 본문 갱신 commit 진행.

## 3. 작업 항목

### Phase 1.7 — D1·D2 합의 후 진행 (G1/G3/G4)

- [x] D1 사용자 합의 — A 채택 확인 (2026-05-27 G1 승인)
- [ ] D2 사용자 합의 — G3·G4 합의 (별 채널 진행 중). 본 항목 완료 전까지 아래 spec/AGENTS 갱신 작업은 미진행
- [ ] `proc/spec/01-AI-명령지침.md §3` 갱신 (D2 합의 후 별 commit/PR):
  - 본 리포 한정: "Next.js 룰 — 본 리포 한정 분기" 항목 신설, spec/09 §9.1 권위 명시, `node_modules/next/dist/docs/` 부재로 표준 Next.js 컨벤션 + 공식 docs 직접 참조 채택
  - games 리포 권위 문서이므로 본 §3 안에 다른 풀림 프로젝트 (planner·Q·classbot) 운용 룰을 적지 않는다 — source of truth 경계 유지 (CLAUDE.md §7 표 참조)
- [ ] `proc/spec/09-기술-환경.md §9.1·§9.6` 갱신 (D2 합의 후 별 commit/PR):
  - §9.1 표의 "AGENTS.md 경고 stale" 표현을 spec/01 §3 분기 룰 인용으로 정합화
  - §9.6 greenfield 셋업 가이드의 "AGENTS.md 경고 진지하게 받아들이기 → node_modules/next/dist/docs/ 가이드 읽기" 단계를 표준 Next.js 컨벤션 + 공식 docs 직접 참조로 갱신
- [ ] `AGENTS.md` 우회 선언 제거 (D2 합의 후 별 commit/PR):
  - 기존 4 라인 "spec/01 §3 ... 적용 불가" 우회 표현 제거 — spec/01 §3 자체에 분기 룰이 들어갔으므로 충돌 X
  - 권위 정합 정착 명시
  - AI 검증 거버넌스 line 12 의 "예: spec/01 §3 Next.js docs 지시 ↔ spec/09 §9.1 표준 Next.js 판정" 충돌 예시 → "spec 본문 인라인 정합화 1차" 룰로 일반화
- [ ] codex review 자동 트리거 → 권위 정합 확인 (spec/AGENTS 갱신 PR 머지 시점). 본 plan 의 archive 이관은 위 spec/AGENTS 갱신 PR 머지 후 별 commit/PR. 본 PR #105 의 codex 진행 상황: round 1 (3건) · round 2 (4건) · round 3 (2건) · round 4 (1건) · round 5 (1건) · round 6 (4건) 모두 fix 통합 진행 중

## 4. 비스코프

- 다른 풀림 프로젝트(planner·Q·classbot) spec/01 §3 운용 — 본 PR 범위 0
- Next.js 16+ 업그레이드 룰 — 별 plan

## 5. 영향도

| 작업 | LOC |
|---|---|
| 본 PR #105: plan 문서 추가 | ≈+80 |
| 후속 PR: spec/01 §3 갱신 | ≈+5 |
| 후속 PR: spec/09 §9.1·§9.6 갱신 | ≈+10 |
| 후속 PR: AGENTS.md 우회 제거 | ≈-4 |

→ 본 PR #105 = docs only (plan 문서). spec/AGENTS 본문 갱신은 후속 PR.
