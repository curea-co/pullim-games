# 2026-05-13 — 일일 실행 plan (Phase 2 + Phase 3 pilot + 후속 산출물)

- **상태**: DRAFT (2026-05-13) — 결정점 3개 합의 필요
- **트리거**: 어제 17:30 산출물 보고 §3 "내일 이어서 할 일" 5건 + 09:30 약속의 4 산출물
- **스코프**: Phase 2 코드 + Phase 3 별 plan + Phase 3.1 pilot 코드 + design-review 재실행 + qa-playwright 후속

## 0. 현 상태 ↔ 약속 매핑

| 09:30 약속 산출물 | 상태 | 비고 |
|---|---|---|
| Phase 2 PR — factorization drop zone strict + 콘텐츠 난이도 | ⬜ | 본 plan §2 트랙 A |
| Phase 3 별 plan 분리 + pilot 1~2 게임 | ⬜ | 본 plan §2 트랙 B. 신규 plan 파일 + PR |
| production design-review 재실행 | ⬜ | 본 plan §2 트랙 C |
| qa-playwright testid + `e2e/game-shell.spec.ts` | ⬜ | 본 plan §2 트랙 D |
| Vercel ↔ GitHub webhook 영구 복구 | ⬜ (사용자) | 본 plan 외 — 사용자 dashboard 작업 |
| 24 icon 시안 + 게임즈 할당 + 차별성 검증 | ⬜ (사용자/디자인) | 본 plan 외 |

main HEAD: `89cb2ce` (PR #23 머지). production: `pullim-games-gq07s7c74` Ready. webhook 끊김 상태 → 매 머지마다 `vercel --prod` 수동 (어제 누적 4회).

---

## 1. 합의 필요한 결정점

### D1 — Phase 3 pilot 범위

- **A** english-word-match distractor 만 (1 게임 pilot, 변경량 최소). retrieval depth shallow → medium 효과 즉시
- **B (추천)** english-word-match distractor + chemistry-balance "정답 확인" 버튼 (2 게임 pilot). 두 가지 패턴 (distractor / 확인 버튼) 모두 검증
- **C** 4 게임 모두 (math-graph-shift, physics-vector 포함) — 1일 안에 무거움. Phase 3.1 + 3.2 분할 필요

**추천 B** — 한 PR 안에 두 가지 변별력 패턴 동시 검증. PR 크기 적당. Phase 3.2 (math-graph-shift, physics-vector) 는 별 trk.

### D2 — design-review 재실행 방식

- **A (추천)** 본 세션 안 짧게 production URL 대상 (1~2 viewport) — desktop + mobile. 신규 findings 0 이면 cleanup plan §6 마지막 [ ] 처리 종결. findings 있으면 별 trk plan 분리
- **B** 별 세션 (시간 여유 + 깊이 있는 audit). 본 일감에서 분리

**추천 A** — design-review 가 자동화된 audit 라 본 세션 안 1회 비용 작음. 결과에 따라 분기.

### D3 — qa-playwright testid + game-shell.spec.ts 범위

- **A (추천)** 본 세션 안 — `data-testid="game-shell-aside"` 등 testid 부여 + `e2e/game-shell.spec.ts` 신규 (5~10 case). PR 1개, 30~60분 예상
- **B** 별 trk plan + 별 PR — 본 일감 분량 과중 시

**추천 A** — 변경량 작고 결정점 적음. 본 세션 안 끝낼 수 있음.

---

## 2. 작업 항목 (D1=B / D2=A / D3=A 채택 가정)

### 트랙 A — Phase 2 (factorization)

- [ ] **①** `src/games/factorization/components/DropZone.tsx` — `forwardRef` 도입 + bounding rect 노출 (`useImperativeHandle` 또는 ref callback)
- [ ] **②** `src/games/factorization/component.tsx` onDragEnd 핸들러 — pointer/element final position 이 drop zone bounding rect 안에 있는지 hit-test 추가. **영역 안 AND distance > threshold** 로 변경
- [ ] **③** `src/games/factorization/content/index.ts` 카드 확장 — 차수 2~3 다양화, 공통인수·차의 제곱·합의 제곱·그룹 분해 패턴 추가 (현재 5장 → 8~10장)
- [ ] **④** factorization 단위 테스트 회귀 (lib/games/factorization)
- [ ] **⑤** e2e 회귀 — `bun run test:e2e` 101/101 green 유지

### 트랙 B — Phase 3 (4 게임 변별력) 별 plan + pilot PR

- [ ] **⑥** 신규 plan 파일 `proc/plan/2026-05-13_game-discrimination-phase3.md` 작성 — 4 게임별 변별력 강화 방식 + 결정점 + 우선순위
- [ ] **⑦** pilot 1: english-word-match — 카드 `extras` 추가 (의미 유사 함정 단어 2~3개) + 우측 옵션 생성 시 extras 포함 + 매칭 판정 (extras 와 매칭 시 wrong-flash)
- [ ] **⑧** pilot 2: chemistry-balance — 실시간 wrong/correct 분기 → "정답 확인" 버튼 클릭 시점 판정. 계수 +/- 변경은 자유, 확정만 판정 진입
- [ ] **⑨** 두 게임 단위 테스트 + e2e 회귀

### 트랙 C — production design-review 재실행

- [ ] **⑩** `/design-review` skill 호출 또는 ad-hoc Playwright screenshot 캡쳐 → AI 검토 (10 official + 게임 허브 + 홈) at desktop + mobile
- [ ] **⑪** 결과 보고서 `proc/archive/design-audit/2026-05-13.md` 작성. findings 0 이면 cleanup plan §6 마지막 [ ] [x] 처리. findings 있으면 별 trk plan

### 트랙 D — qa-playwright testid + game-shell.spec

- [ ] **⑫** `src/components/game-shell/GameShell.tsx` — content section 에 `data-testid="game-shell-content"`, footer 에 `data-testid="game-shell-cta"` 부여 (aside slot 은 폐기됐으니 N/A)
- [ ] **⑬** `e2e/game-shell.spec.ts` 신규 — variant 별 layout 정책 자동 검증 (split lg+ 단일 컬럼, stack 항상 세로, match lg+ 720). 5~10 case
- [ ] **⑭** e2e 회귀 (101 + 신규 5~10 case)

---

## 3. PR 분할

PR 3개 분할 권장:

| PR | 트랙 | 의존성 | 예상 |
|---|---|---|---|
| PR A | Track A (Phase 2 factorization) | 독립 | 1~2h |
| PR B | Track B (Phase 3.1 pilot 2 게임) | 독립. plan 파일 포함 | 2~3h |
| PR C | Track D (qa-playwright testid + spec) | 독립 | 30~60m |

Track C (design-review) 는 별 PR 아님 — archive 파일만 추가, 별 commit 으로 PR A 또는 B 에 묶거나 독립 commit.

merge 순서 우선순위: PR C → PR A → PR B (선후 독립이지만 PR C 의 testid 가 PR A·B 회귀 검증에 도움).

---

## 4. 비스코프 (별 trk / 별 세션)

- Phase 3.2: math-graph-shift + physics-vector 변별력 강화 — 본 plan §2 트랙 B 의 D1=B 채택 시 별 PR
- chemistry-balance aside Phase B 확장 — aside 정책 폐기됐으니 plan 자체 폐기 (어제 PR #22)
- design-review F6~F17 medium/polish 11 findings — 별 묶음 작업
- 24 icon 시안 마무리 + 게임즈 할당 (사용자/디자인 트랙)
- Vercel ↔ GitHub webhook 영구 복구 (사용자 dashboard 작업)
- qa-playwright Phase 3 (cross-browser firefox/webkit 매트릭스 확장)

---

## 5. 합의 후 진행

추천안 D1=B / D2=A / D3=A 그대로면 "추천대로 진행" 한 줄로 OK. Track A·B·C·D 순차 진행 (Track D 먼저 → A → B → C 검증 순서가 효율적).

다른 우선순위/범위 원하면 D1/D2/D3 어느 옵션 + 추가 의견 알려주세요.
