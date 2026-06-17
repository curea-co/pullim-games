@AGENTS.md

# 풀림 게임즈 작업 가이드

이 프로젝트는 **풀림 시리즈 중 독립 학습 게임 카탈로그**다. `pullim-planner` / `pullim-Q` / `pullim-classbot`과 달리 `pullim-study-demo` 추출본이 아니며, 자체 SPEC(`proc/spec/01~10`)을 권위 문서로 둔다.

> **공통 운영 규칙은 `~/dev_git/.pullim-meta/CONVENTION.md` 참조** (게이트키퍼 G1~G4 정의, daily_outcome 양식, 명령 표준, 배포 정책).

> **모노레포 구조 (2026-06-17~)**: 앱은 `apps/games/` 에 위치 (Turborepo, planner/Q 와 동형 토폴로지). 본 문서의 `apps/games/src/...`·`apps/games/scripts/...` 등 앱 경로는 **모노레포 루트 기준**. dev/build/test 는 루트에서 turbo 로 실행 (`bun dev` = `turbo dev`, `bun run build`·`bun run test`). backend·packages 는 thin monorepo 정책상 미생성 — BE 는 별 repo `pullim-api`. 근거: `proc/plan/2026-06-17_monorepo-restructure.md`.

## 1. 도메인 범위

| 영역 | 경로 |
|---|---|
| **게임 라우트** | `apps/games/src/app/games/`, `apps/games/src/app/manage/` (관리) |
| **게임 카탈로그** | `apps/games/src/games/{21개 게임}/` |
| **메커니즘 컴포넌트** | `apps/games/src/components/game-mechanics/{Blank,QuickQuiz,Typing,WordMatch}Component.tsx`, `useAttemptCounter.ts` |
| **게임 셸·허브** | `apps/games/src/components/{game-shell,game-hub,dashboard,GameCard,RecommendationCard}/` |
| **공유 lib** | `apps/games/src/lib/{core,games,server,utils.ts}/` |
| **레지스트리 자동화** | `apps/games/scripts/generate-registry.ts` (predev/prebuild에서 실행) |

### 21개 게임 (2026-05-15 기준)

`bio-taxonomy`, `chemistry-balance`, `cloze-multi`, `custom-{blank,multiple-choice,typing,word-match}`, `english-{blank,order,vocab-typing,word-match}`, `factorization`, `genetics-punnett`, `history-timeline`, `image-hotspot`, `korean-pos-tagging`, `letter-assembly`, `math-graph-shift`, `math-quick-quiz`, `physics-vector`, `vocab-typing`

### 4 메커니즘

| 메커니즘 | 컴포넌트 | 활용 게임 예시 |
|---|---|---|
| QuickQuiz | `QuickQuizComponent.tsx` | math-quick-quiz, custom-multiple-choice |
| Blank | `BlankComponent.tsx` | english-blank, custom-blank, cloze-multi |
| Typing | `TypingComponent.tsx` | vocab-typing, english-vocab-typing, custom-typing |
| WordMatch | `WordMatchComponent.tsx` | english-word-match, custom-word-match |

5회 오답 시 `useAttemptCounter` → `RevealBanner`로 정답 공개. `CorrectBurst`는 정답 시 공통 피드백.

## 2. 공유 영역 — read 자유, write는 사용자 확인 후

| 영역 | 경로 | 주의 |
|---|---|---|
| 게임 셸 | `apps/games/src/components/shell/`, `apps/games/src/components/game-shell/` | 21개 게임 공통 셸 — 수정 시 전 게임 영향 |
| UI 프리미티브 | `apps/games/src/components/ui/` | shadcn/ui + Radix |
| 디자인 시스템 | `proc/spec/08-디자인-시스템.md` (read only) | |
| 게임 lib | `apps/games/src/lib/core/`, `apps/games/src/lib/games/` | FSRS·checkAnswer 등 핵심 로직 |
| 앱 설정 | `apps/games/{next.config.ts, eslint.config.mjs, package.json, tsconfig.json, tailwind.config.ts}` | |
| 모노레포 설정 | 루트 `package.json`(workspaces), `turbo.json`, `tsconfig.base.json` | 전 앱 영향 |

## 3. 권위 문서 (read only)

다른 풀림 프로젝트와 달리 **`proc/spec/01~10`이 권위 문서**다. `input/docs-archive/`에 풀림 마스터 문서가 없음 — 독립 프로젝트이기 때문.

| 문서 | 내용 |
|---|---|
| `proc/spec/01-AI-명령지침.md` | AI 에이전트 작업 룰 |
| `proc/spec/02-제품-정의.md` | 제품 정의 |
| `proc/spec/03-핵심-기능.md` | 핵심 기능 명세 |
| `proc/spec/04-사용자-경험.md` | UX 가이드 |
| `proc/spec/05-비즈니스-정책.md` | BM·정책 |
| `proc/spec/06-콘텐츠-데이터.md` | 콘텐츠 데이터 구조 |
| `proc/spec/07-브랜딩.md` | 브랜딩 |
| `proc/spec/08-디자인-시스템.md` | 디자인 시스템 |
| `proc/spec/09-기술-환경.md` | 기술 스택·환경 |
| `proc/spec/10-개발-로드맵.md` | 개발 로드맵 |

## 4. 작업 컨벤션

활성 게이트키퍼: **G1 / G3 / G4** (G2 부대표 미할당). 자세한 운영은 `~/dev_git/.pullim-meta/CONVENTION.md` §2.

### 해도 되는 것

- 21개 게임 중 단일 게임 작업: `apps/games/src/games/<game-name>/` 신규·수정
- 4 메커니즘 컴포넌트 보강 (`apps/games/src/components/game-mechanics/`)
- `apps/games/src/games/<game-name>/`에서 메커니즘 import해서 콘텐츠·스키마·distractor 추가
- `proc/audit/`에 카탈로그 정기 감사 산출물 추가 (다른 풀림 프로젝트의 `proc/knowhow/`에 대응되는 자리)
- 새 게임 추가 후 `bun run gen:registry`로 레지스트리 갱신

### 사용자 명시 확인 후

- 게임 셸·메커니즘 컴포넌트 시그니처 변경 → 21개 게임 영향
- `apps/games/src/lib/core/`, `apps/games/src/lib/games/` 공통 로직 수정 (checkAnswer, FSRS 등)
- `proc/spec/01~10` 권위 문서 수정 — G1/G3/G4 합의 필요
- `apps/games/scripts/generate-registry.ts` 수정 → predev/prebuild 자동 트리거

### 하면 안 되는 것

- 다른 풀림 프로젝트(planner/Q/classbot)의 코드·페이지·mock 참조 — **독립 프로젝트**이므로 cross-domain 의존 금지
- `vercel --prod` 수동 배포 전에 production 검증 보고 — 머지 ≠ 배포

## 5. 도구 보조

| 상황 | 명령 |
|---|---|
| 개발 (dev) | `bun dev` → http://localhost:**3033** (다른 풀림은 3030, games만 3033) |
| 정적 검증 | `bun run typecheck && bun run lint` (루트 turbo — 앱 tsconfig 은 apps/games) |
| 빌드 | `bun run build` (predev/prebuild에서 `gen:registry` 자동 실행) |
| 단위 테스트 | `bun test` (vitest) |
| e2e | `bun run test:e2e` (playwright) |
| 게임 레지스트리 수동 갱신 | `bun run gen:registry` |
| 배포 (수동) | `bunx vercel --prod` |

## 6. proc/ 폴더 구조

```
proc/
├── spec/       # 01~10 정식 SPEC (권위 문서)
├── plan/       # 작업 계획 (YYYY-MM-DD_<topic>.md)
├── archive/    # 완료된 plan·design-audit
├── research/   # 조사·분석 결과
└── audit/      # 게임 카탈로그 정기 감사 (games 고유 — 다른 풀림은 knowhow)
```

`audit` 폴더는 games 고유. 21개 게임의 visual·인터랙션·BUG 정기 점검 산출물 누적. 결정 근거는 `~/dev_git/.pullim-meta/DECISIONS.md` D2 참조. **audit 트리거 룰·doc 양식은 `~/dev_git/.pullim-meta/CONVENTION.md` §7 참조** (games 한정). **UI 변경 PR 4 viewport 캡처 의무는 `~/dev_git/.pullim-meta/CONVENTION.md` §8 참조** — `bun run ui:audit <path>` 로 사전 검증.

## 7. 다른 풀림 프로젝트와의 관계

| 항목 | games | planner / Q / classbot |
|---|---|---|
| origin | 독립 프로젝트 | `pullim-study-demo` 추출본 |
| Next.js | 15 | 16 |
| 포트 | 3033 | 3030 |
| 권위 문서 | `proc/spec/01~10` | `input/docs-archive/*.md` |
| proc 5번째 | `audit/` | `knowhow/` |
| 운영 규칙 | `.pullim-meta/CONVENTION.md` | `.pullim-meta/CONVENTION.md` |

→ 4개 모두 `.pullim-meta/CONVENTION.md`의 공통 운영 규칙은 따른다. 도메인·기술 스택·권위 문서는 games만 별도.

## 8. 컨벤션 변경

본 문서나 `~/dev_git/.pullim-meta/CONVENTION.md`를 수정해야 할 때는 **별도 작업으로 분리**. 일반 게임 작업 도중 컨벤션 파일을 함께 수정하지 말 것 (PR 섞임 방지).

## 9. AI 검증 거버넌스

본 리포는 `.github/workflows/codex-review.yml` (Codex Review) 를 PR 검증 게이트로 사용한다. 검증 결과의 신뢰성을 지키기 위해 다음 룰을 따른다 — **사용자 합의 2026-05-20**.

### 원칙 — "검사관을 매수하지 마라"

검증자(Codex)의 룰북·프롬프트·트리거를 claude 가 임의로 수정해서 지적을 회피하는 행위는 **작업 결과의 신뢰성을 오염**시킨다. 검사관은 코드를 검증하는 존재이지, 코드 측이 매수할 대상이 아니다.

### 해야 하는 것

- **codex 지적은 원칙적으로 코드 fix 로 응답.** 룰북(workflow yml·프롬프트·AGENTS.md·CLAUDE.md·proc/spec/01~10) 을 **회피 목적**으로 수정하는 행위 금지. codex 가 실제 명세 결함을 짚은 경우는 회피가 아니라 정당한 명세 진화 — 아래 §2 명세 우선 원칙 경로로 spec 을 먼저 정정한 뒤 코드 fix 가능
- **단, 명세 자체가 틀렸다고 판단되는 경우 — `proc/spec/01-AI-명령지침.md §2 명세 우선 원칙` 의 정상 경로를 따른다 (절차 본문은 본 §9 + plan-g 가 출처, §2 자체는 "명세 먼저 수정, 그 뒤에 코드" 원칙만 명시):**
  1. 별 plan (`proc/plan/`) 에 "명세 충돌·수정 근거" 기록 — 본 거버넌스 정착 근거는 `proc/archive/plan/2026-05-20_plan-g-pullim-workflow-port.md` (COMPLETE archive 이관)
  2. 사용자(G1/G3/G4) 합의 — 권위 문서(`proc/spec/01~10`) 수정은 본 CLAUDE.md **§4 "사용자 명시 확인 후"** 룰
  3. 합의 후 spec 먼저 수정, 그 뒤에 코드 fix
  - 이 경로는 "회피"가 아니라 정당한 명세 진화. codex 지적이 spec 결함을 짚은 경우에도 동일하게 적용
- **사전 sweep 의무 (PR 생성 전):**
  - 본 리포 권위 문서(`proc/spec/01~10`) 룰 위반 점검 — 특히 `01-AI-명령지침.md` §3 코드 정책·§7 문서 라우팅, `09-기술-환경.md` 보안·런타임 검증
  - workflow boilerplate 점검 (timeout / artifact 보관 / permissions 최소화 / pull_request_target 가드 등 codex-review.yml 기존 패턴)
  - 보안 boilerplate 점검 (secret 노출·외부 입력 런타임 검증·`safety_strategy=unsafe` 정당화)
- **정당한 trade-off 는 별 plan 합의 후 기록.** `KNOWN-TRADE-OFF: <근거 plan 경로>` 패턴으로 코드/주석에 명시. 단, 패턴 자체를 codex 프롬프트에 *추가하지 말 것* — claude→codex 통제 방향이 되어 거버넌스 위반

### 하면 안 되는 것

- codex review 결과를 **회피할 목적으로** `.github/workflows/codex-review.yml` 의 프롬프트·트리거·paths-filter 수정 (단, 코드 fix 가 불가능한 진짜 인프라 버그 fix 는 별 plan 후 가능)
- 룰북(AGENTS.md / CLAUDE.md / proc/spec) 을 "codex 가 이걸 지적 못 하게" **회피 목적으로** 수정 — 명세 자체 결함을 spec/01 §2 경로로 고치는 것과는 구분
- 사전 sweep 없이 PR 띄우고 codex 지적 받은 뒤 룰북 쪽 수정으로 우회
- "회피"와 "정당한 명세 수정" 의 판단은 **별 plan + 사용자 합의 유무** 로 가른다 — claude 단독 판단 금지

### 거버넌스 위반 시

- claude 가 codex 룰북 회피 수정을 시도하면 사용자가 **즉시 정정 지시** → 해당 변경은 revert, 코드 fix 로 재응답
- 본 룰은 본 리포 한정. 4 풀림 공통 운영룰 변경 필요 시 별 PR (`.pullim-meta/CONVENTION.md`)
