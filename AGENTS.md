<!-- BEGIN:nextjs-agent-rules -->
# Next.js — 권위 문서는 `proc/spec/09 §9.1`

본 리포의 Next.js 판단은 `proc/spec/09-기술-환경.md §9.1` 이 최종 권위 — **표준 Next.js 15.5+ (App Router)** 가 설치되어 있고, `node_modules/next/dist/docs/` 는 부재한다 (spec/09 §9.1 표 명시). 상단 boilerplate("This is NOT the Next.js you know") 와 `proc/spec/01 §3` 의 "AGENTS.md Next.js 경고를 진지하게 받아들이고 `node_modules/next/dist/docs/` 를 먼저 읽는다" 지시는 모두 spec/09 §9.1 우선에 따라 본 리포 환경에서는 **적용 불가** — 표준 Next.js 컨벤션을 사용한다. 권위 문서 간 잔여 충돌(spec/01 §3 ↔ spec/09 §9.1)은 별 plan(`proc/plan/2026-05-20_plan-g-pullim-workflow-port.md`) 합의 후 후속 PR 에서 spec/01 §3 본문을 정합화 예정.

단, **Next.js major upgrade·deprecation notice 가 보이면 진지하게 확인**하라 — 학습 데이터 컷오프 이후 breaking change 가 있을 수 있다. 충돌 시 항상 `proc/spec/09` 가 우선한다.
<!-- END:nextjs-agent-rules -->

## AI 검증 거버넌스 (요약)

- 본 리포는 **bun + Next.js 15** (npm/npx 직접 호출 금지 — `proc/spec/09 §9.1`).
- 권위 문서는 `proc/spec/01~10` — 룰 모호하면 spec 우선. 단 권위 문서 간 충돌(예: spec/01 §3 Next.js docs 지시 ↔ spec/09 §9.1 표준 Next.js 판정) 은 더 구체적·신규 spec 우선이며, 위 Next.js 블록처럼 본 리포 환경에서의 해석을 AGENTS.md/CLAUDE.md 가 명시한다.
- **Codex Review 회피 금지.** codex 지적은 원칙적으로 코드 fix 로 응답. 룰북(workflow yml·프롬프트·AGENTS.md·CLAUDE.md·spec) 회피 목적 수정 X. 단, 명세 자체 결함 지적은 정당한 명세 진화 경로(별 plan + 사용자 합의 → spec 수정 → 코드 fix)로 정정 가능 — 절차는 `CLAUDE.md §9` 및 `proc/plan/2026-05-20_plan-g-pullim-workflow-port.md` 참조 (근거: `proc/spec/01 §2` 명세 우선 원칙).

## 아키텍처 — 단일 백본 + 다중 게임 모드

**메모리 룰 출처**: `project_architecture_decision`. 본 리포는 21 게임이 분리된 백본을 갖지 않고, FSRS 알고리즘·스트릭·활동 로그·변별력 distractor helper 의 **단일 백본** 위에서 mode wrapper (`default`·`review-queue`·`time-attack`·`deep-recall`) 로만 다양화한다.

- 백본 위치: `src/lib/core/fsrs/` (FSRS-6, ts-fsrs 5.3.3), `src/lib/core/fsrs/modes/` (mode wrapper), `src/lib/core/distractor/buildDistractors.ts` (변별력)
- 분리된 게임 백엔드·스튜디오·점수 시스템 없음. 새 백본 추가·분리 제안은 메모리 룰 위반 (`feedback_scale_hypercasual` 도 같이 위반)
- 모드 진입은 URL `?mode=<mode>` 패턴 (PR #85 Phase 2 정착). selectCardsForMode·useGameMode hook 으로 통합
- 신규 모드 추가 시: `GameMode` enum 갱신 → `resolveRating(mode, outcome)` 분기 정식화 → silent fallback 금지

## 4 메커니즘 컴포넌트 — 직접 게임 컴포넌트 작성 금지

`src/components/game-mechanics/` 4 메커니즘 (`QuickQuizComponent`·`BlankComponent`·`TypingComponent`·`WordMatchComponent`) 을 활용 가능하면 **반드시 활용**한다. 신규 게임은 콘텐츠·스키마·distractor 만 작성하고 메커니즘 컴포넌트를 import — 게임 전용 풀-스택 컴포넌트 작성은 회피.

- 메커니즘 활용 게임 (현재): `custom-*` 4 종 · `english-blank/vocab-typing/word-match` · `math-quick-quiz` · `vocab-typing` 등 9 게임 + extras path
- 직접 컴포넌트 게임 (현재 12 종): `bio-taxonomy`·`chemistry-balance`·`factorization`·`genetics-punnett`·`history-timeline`·`image-hotspot`·`korean-pos-tagging`·`letter-assembly`·`math-graph-shift`·`physics-vector`·`cloze-multi`·`english-order` — 이들도 신규 작업 시 메커니즘 위로 통합 가능성 우선 평가
- 5회 오답 정답 공개 (`useAttemptCounter` + `RevealBanner`) 및 정답 시각 피드백 (`CorrectBurst`) 은 공통 룰 — 새 메커니즘·게임 모두 적용 의무 (메모리 룰 `feedback_correct_feedback_and_reveal`)

## 디자인 토큰 — silent fallback 금지

`tailwind.config.ts` 가 정의한 토큰만 사용한다. 미정의 토큰은 Tailwind 가 클래스 자체를 누락(silent fallback) 시키므로 시각 회귀가 PR diff 에서 발견되지 않는다 — 4 viewport audit (아래) 만이 마지막 방어선.

- 정의 색 토큰: `pullim-slate-{50,100,…,900}` · `pullim-blue-{50,…,900}` · `pullim-danger` · `accent-positive` · `accent-negative` · `bg-primary` · `bg-block` · `border-hairline` · `type-primary` · `type-secondary`
- 권위 문서: `proc/spec/08-디자인-시스템.md` §8.1 color palette + §8.2 typography (Pretendard Variable 만, `system-ui`·`Inter`·`Roboto`·`-apple-system` 금지)
- 신규 토큰 필요 시: `tailwind.config.ts` 와 `proc/spec/08` §8.1 동시 갱신 — 한쪽만 추가하면 silent fallback 또는 spec 표류
- AI slop 패턴 회피: border-radius `16px+` 일반 사용 금지 (`spec/08 §8.4`), 버튼은 `6px`·블록은 `4px`·드롭존은 `8px`

## 하이퍼캐주얼 — RPG 패턴 금지

**메모리 룰 출처**: `feedback_scale_hypercasual` + `feedback_design_priorities` (학습효과 > 중독성).

- 금지: 보스레이드·장비·시즌·랭킹·뱃지·캐릭터 레벨·재화·뽑기·길드·PVP
- 허용: 단순 진행도·스트릭·정답 시각 피드백·모드 선택 (학습 곡선 우선)
- 시간 압박도 캐주얼 톤 유지 — `time-attack` 30초/카드 + 부드러운 색 강조 (`Plan E §0.C`). 카운트다운 폭발·실패 화면 등 학습 압박 X
- 외재 보상(보석·코인) 도입 제안은 메모리 룰 위반

## viewport 4 audit — UI 변경 PR 머지 전 의무

**룰 출처**: `~/dev_git/.pullim-meta/CONVENTION.md §8`.

`src/components/{game-mechanics,game-shell,game-hub,shell,dashboard,RecommendationCard,GameCard,manage}/` · `src/components/ui/` · `src/app/**/page.tsx|layout.tsx` · `src/games/*/component.tsx` · `tailwind.config.ts` 변경 PR 은 머지 전 `bun run ui:audit <path>` 실행 + 결과 PR body 첨부 의무.

- 4 viewport: **320×568** (iPhone SE) · **390×844** (iPhone 13/14/15) · **768×1024** (iPad portrait) · **1280×800** (desktop)
- critical overflow (`right > vw + 1` 또는 `bottom > vh + 1`) 0 까지 fix 후 머지 (HARD gate). informational 은 경고만 (form 내·sticky·fixed)
- CSS/Tailwind 클래스만 변경된 PR 도 포함. docs only PR 은 면제

## 권위 문서 라우팅

| 우선순위 | 위치 | 비고 |
|---|---|---|
| 1 | `proc/spec/01~10` | 정식 SPEC (권위) — 룰 모호하면 spec 우선 |
| 2 | `CLAUDE.md` | 본 리포 작업 가이드 (한국어 도메인 룰·게이트키퍼·proc 폴더 구조) |
| 3 | `AGENTS.md` (본 문서) | Codex Review·외부 AI 에이전트용 룰 요약. 본 리포 환경 한정 해석 명시 |
| 4 | `~/dev_git/.pullim-meta/CONVENTION.md` | 4 풀림 공통 운영 룰 (게이트키퍼·daily_outcome·audit §7·viewport §8) |
| 5 | `proc/plan/` · `proc/audit/` · `proc/research/` | 진행 중 plan·정기 audit·조사 결과 (참조) |

권위 문서 간 충돌은 더 구체적·신규 spec 우선. 본 리포 환경 해석은 위 §"Next.js — 권위 문서는 `proc/spec/09 §9.1`" 패턴처럼 AGENTS.md 가 명시한다.
