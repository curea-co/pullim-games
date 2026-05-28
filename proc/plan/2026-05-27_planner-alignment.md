# 2026-05-27 — games 도메인 진화 plan (외부 사례 비교 포함)

> **상태**: DRAFT (2026-05-27). 본 plan 은 코드 변경 0 — 정렬 로드맵 문서화만. 진입은 진행 중인 별 PR 마감 후.
> **본 리포의 유일한 권위 문서**:
> - `proc/spec/01-AI-명령지침.md` ~ `proc/spec/10-개발-로드맵.md` (games 자체 SPEC, 10건)
> - 루트 `CLAUDE.md`, `AGENTS.md` (운영 규칙)
> - `.pullim-meta/CONVENTION.md` (4 풀림 공통 운영 룰, viewport audit 등)
>
> **외부 비교 대상** (참고용 — 권위 아님, 본 리포 의사결정 근거가 될 수 없음):
> - 풀림 생태계의 다른 프로젝트(`pullim-planner` 등)가 모노레포·NestJS BE·Container/Presenter 등 어떤 구조를 선택했는지에 대한 *맥락 정보*.
> - 본 plan 내에서 외부 사례를 언급할 때는 "참고" 표시 — 의사결정 근거는 반드시 본 리포 spec + 사용자 합의.
> - 외부 리포의 절대경로·코드·페이지·mock 직접 참조는 루트 `CLAUDE.md` 룰에 따라 금지. 본 plan 도 그 룰에 종속.

---

## 0. 한 줄 요약 — 그리고 갭 경고

`pullim-games` 는 풀림 4종(`planner` / `Q` / `classbot` / `games`) 중 **나머지 셋과 가장 갭이 큰 별개 종**이다. 4종 중 셋(planner/Q/classbot, 참고용 외부 사례) 은 `pullim-study-demo` 추출본·Next.js 16·Tailwind 4·shadcn `base-nova/neutral/cssVariables:true` 라인 위에 있다고 알려져 있고, planner 는 이미 bun workspace 모노레포 + NestJS BE 도입 단계에 진입했다는 *맥락 정보* 가 있다. games 는 **독립 origin**·**Next.js 15** (현 `proc/spec/09 §9.1`)·**Tailwind 3**·**shadcn `new-york/slate/cssVariables:false`**·**DB 없음**·**mock 없음**·**21 게임 카탈로그 + `gen:registry` 자동화**·**자체 `proc/spec/01~10` 권위**·**`ANTHROPIC_API_KEY` 외부 API 사용** (서버 액션 경로, §1.2 참조)·**포트 3033** (의도된 분리) — 외부 사례와의 차이가 가장 크다.

따라서 본 plan 은 모노레포 전환(`Phase α`) 이전에 **Phase 0a~0d (마이그레이션 사전 단계)** 를 신설해 단계적으로 갭을 메운 뒤 진입한다. 단, 각 Phase 의 *진입 자체* 는 본 리포 `proc/spec/01~10` 변경에 대한 사용자 합의가 선행되어야 한다 (예: Phase 0a 의 Next.js 16 업그레이드는 `proc/spec/09 §9.1` 의 "표준 Next.js 15.5+" 변경 합의 후 진입). 동시에 games 의 강점(`gen:registry`, 21 게임 카탈로그, 자체 SPEC 권위)을 보존하고, **BE 도입 여부 자체가 결정 미정** 인 점을 §3 옵션 비교 + §10 사용자 결정 슬롯에 명시한다.

본 plan 의 **완료 정의** (이 plan 전체):
- 본 plan 문서가 머지 + 사용자(G1/G3/G4) 1차 review
- Phase 0a~0d → α → β → ... 의 진입 게이트가 본 plan 내 §6 에 명문화
- §3 갭 매트릭스가 games 시점에서 추적 가능한 단일 source 로 정착
- §10 "사용자 결정 필요" 9 항목 중 최소 1 항목(BE 도입 옵션 A/B/C) 합의 → 후속 Phase 진입

---

## 1. 배경 — games 가 별개 종인 이유

### 1.1 origin 차이

| 항목 | planner / Q / classbot | games |
|---|---|---|
| origin | `pullim-study-demo` 추출본 (공통 부모) | **독립 신규 프로젝트** (2026-05-07 SPEC 작성) |
| 권위 문서 | `input/docs-archive/*` (풀림 마스터 문서) | **`proc/spec/01~10`** (자체 SPEC) |
| proc 5번째 폴더 | `knowhow/` | **`audit/`** (21 게임 정기 감사) |
| 도메인 단위 | 학습 보조 도구 (단일 도메인) | **카탈로그형 21 게임** + 4 메커니즘 컴포넌트 + FSRS 단일 백본 |

games 는 `pullim-study-demo` 의 어떤 시그니처도 상속받지 않았다 — 따라서 planner 의 mock·entity·page 시그니처가 games 에는 적용 안 됨.

### 1.2 기술 스택 차이 (verbatim 비교)

| 항목 | planner | games | 갭 |
|---|---|---|---|
| Next.js | **16.2.4** (App Router) | **15.x** (App Router) | major upgrade 1개 |
| React | 19.2.4 | ^19.0.0 | 호환 (minor) |
| Tailwind | **4.x** + `@tailwindcss/postcss` | **3.4.x** + `autoprefixer` | major upgrade 1개 (CSS-first config) |
| shadcn style | `base-nova` | `new-york` | 토큰 라인 다름 |
| shadcn baseColor | `neutral` | `slate` | 팔레트 다름 |
| shadcn cssVariables | **true** | **false** | 토큰 인터페이스 다름 (Tailwind class vs CSS var) |
| 패키지 매니저 | bun + workspaces | bun (단일 앱) | workspace 미적용 |
| 모노레포 | `apps/{planner,backend}/` + `packages/{types,api-client,auth}/` | **단일 앱** (모노레포 미적용) | 전체 재편 필요 |
| BE | NestJS 11 + TypeORM + Postgres (Phase β 이후) | **없음** (정적 카탈로그 + client-side FSRS state) | BE 도입 자체가 미결정 |
| DB | Postgres 16 + Drizzle → TypeORM 마이그레이션 중 | **없음** | n/a |
| mock | `apps/planner/src/lib/mock/*` (Phase η 까지 잔존) | **없음** (직접 정적 데이터) | n/a |
| FE 컨벤션 | Container/Presenter + `features/<domain>/` (Phase 1~3 진행) | **자체 game-mechanics 4 컴포넌트 + game-shell + game-hub** | 컨벤션 mapping 새로 정의 필요 |
| 자동화 | (없음) | **`scripts/generate-registry.ts` predev/prebuild 자동 트리거** | games 특유 — 보존해야 함 |
| 외부 API | (없음) | **`ANTHROPIC_API_KEY`** — `src/app/manage/content/actions.ts` 서버 액션이 `src/lib/server/ai/anthropic.ts` 를 import (management 자동 생성). `src/app/api/` 에는 `/api/event` 만 존재 (Anthropic 라우트 부재) | games 특유 |
| 포트 | 3030 | **3033** | 충돌 없음 (의도된 분리) |
| viewport 4 audit | (없음 — planner는 단일 도메인이라 의무 없음) | **`bun run ui:audit <path>` HARD gate** (UI 변경 PR 의무) | games 특유 — 보존해야 함 |

### 1.3 권위 문서 차이

planner: `input/docs-archive/08_풀림_플래너_핸드오프.md` + `proc/spec/2026-05-18_be-api-design.md` (BE spec).
games: `proc/spec/01-AI-명령지침.md` ~ `10-개발-로드맵.md` (10개) — **숫자 prefix 정식 SPEC**. 풀림 마스터 문서 부재.

→ 정렬 시 games 의 자체 SPEC 을 **삭제·흡수해서는 안 된다** (사용자 합의 시까지). 보존 옵션은 §5 에 분리.

### 1.4 BE 부재의 함의

참고: 외부 사례 (planner 등) 는 이미 9 endpoint(`GET /api/me`, 도메인 CRUD 등) + Postgres 가 동작 중인 상태에서 NestJS 도입을 진행했다는 *맥락 정보* 가 있다 — games 와는 출발점이 다름.
games 는 **Drizzle 이 없고**, `src/app/api/` 에는 `/api/event` 만 정의돼 있을 뿐 (Vercel Analytics + 자체 이벤트 로그용). Anthropic 호출은 별도 API 라우트가 아니라 `src/app/manage/content/actions.ts` 서버 액션 → `src/lib/server/ai/anthropic.ts` 흐름이다. 사용자 별 server state 는 거의 없고 FSRS state·streak 도 localStorage 기반. 따라서 BE 도입은 외부 사례와 직접 비교 불가한 결정 (§3 옵션).

### 1.5 진행 중 별 PR — 본 plan 의 진입 전제

사용자 안내: 본 리포에는 현재 진행 중인 별 PR이 있다. 본 plan 은 그 PR 의 마무리(머지 또는 close) **이후** 진입을 전제한다. 본 plan 머지 자체는 코드 변경 0 이므로 진행 중 PR 과 충돌 없음 — plan 문서만 추가.

---

## 2. 비목표 (scope out)

본 plan 은 *정렬 로드맵 문서화* 이므로 다음을 본 plan PR 에서 다루지 않는다:

- Next.js 16 업그레이드 자체 (Phase 0a 별 PR)
- Tailwind 4 마이그레이션 자체 (Phase 0b 별 PR)
- shadcn 재발급 자체 (Phase 0c 별 PR)
- `gen:registry` 의 모노레포 경로 갱신 자체 (Phase 0d / α 별 PR)
- 모노레포 전환 자체 (Phase α 별 PR)
- BE 도입 자체 — 옵션 선정 합의 (사용자 G1/G3/G4) 까지 보류 (§3 + §10)
- games 의 21 게임 자체에 대한 변경 (메커니즘·콘텐츠·distractor — 본 plan 무관)
- `/api/event` 라우트 변경 (`ANTHROPIC_API_KEY` 라우트 포함)
- 본 plan 의 archive 이동 (사용자 명시 시점까지 `proc/plan/` 잔존 — 메모리 룰 `feedback_plan_archive`)

---

## 3. 갭 매트릭스 + BE 도입 결정 옵션

### 3.1 갭 매트릭스 (planner ↔ games)

§1.2 에서 raw 비교했고, 본 절은 **마이그레이션 비용·리스크** 관점에서 다시 정리.

| 갭 | 종류 | 단방향 마이그레이션 비용 | 시각 회귀 위험 | games 의 강점 손실 위험 |
|---|---|---|---|---|
| Next.js 15→16 | 프레임워크 major | 중 (App Router 패턴 일부 변경, generateStaticParams 등) | 낮음 (렌더 동일 기대) | n/a |
| Tailwind 3→4 | CSS-first config | 중-상 (postcss 변경, 토큰 정의 위치 이동, `@theme` 도입) | **중** (silent fallback 위험 — spec/08 §8.1 토큰 정합 필요) | n/a |
| shadcn `new-york/slate/cssVar:false` → `base-nova/neutral/cssVar:true` | 토큰 라인 + 인터페이스 동시 변경 | **상** (21 게임 전체 시각 회귀 검증 필요) | **상** | spec/08 자체 정의 토큰 (`pullim-slate-*`, `pullim-blue-*`, `bg-primary` 등) 과 shadcn 토큰의 합의 필요 |
| 단일 앱 → `apps/{games,backend?}/` + `packages/*` | 디렉토리 재편 | 중 (`gen:registry` 경로 갱신 동반) | 낮음 (import path 만 변경) | `gen:registry` 자동화 보존 필요 |
| `gen:registry` predev/prebuild | games 특유 | 갱신 필요 (`apps/games/scripts/` 또는 `packages/games-registry/`) | 낮음 | **자동화 보존 의무** |
| `ui:audit` HARD gate | games 특유 | 경로 갱신 필요 (모노레포 후 `apps/games/scripts/`) | 낮음 | **HARD gate 보존 의무** |
| BE 부재 → BE 도입? | 결정 미정 | 옵션 A/B/C (§3.2) | n/a | 정적 카탈로그 단순함 손실 가능 |
| 자체 SPEC `proc/spec/01~10` | games 권위 | 보존 vs 부분 흡수 (§5) | n/a | **자율성 보존 의무 — 사용자 합의 시까지** |
| `ANTHROPIC_API_KEY` server route | games 특유 | BE 도입 옵션에 따라 이동 위치 결정 | n/a | management 자동 생성 흐름 보존 필요 |
| `proc/audit/` (감사 폴더) | games 특유 (`knowhow/` 대신) | 보존 (모노레포 후에도 `apps/games/proc/audit/` 또는 root `proc/audit/`) | n/a | **감사 누적 history 보존 의무** |
| 포트 3033 | 의도된 분리 | 보존 (모노레포 후에도 games 만 3033) | n/a | 4 풀림 동시 dev 시 충돌 방지 |

### 3.2 BE 도입 옵션 — 사용자 결정 필요

games 의 현 상태는 BE 부재 + 정적 카탈로그 + client-side FSRS state. 다음 3 옵션 중 합의가 필요하며 **§10 결정 슬롯** 으로 게이트.

#### 옵션 A — BE 미도입 (현 상태 유지)

- 카탈로그 정적 유지 (`src/games/<id>/manifest.ts` + `gen:registry`)
- 사용자 진척도(FSRS state)·streak·activity 는 **client-side localStorage 만**
- `/api/event` 만 server route (Vercel Analytics + 자체 이벤트 로그)
- `ANTHROPIC_API_KEY` 흐름은 그대로 — `src/app/manage/content/actions.ts` 서버 액션 → `src/lib/server/ai/anthropic.ts` (현 구조 유지, Route Handler 로의 재구성 없음)
- `apps/backend/` 신설 안 함 — 모노레포는 `apps/games/` 단일 앱 + `packages/{types,ui?}/` 정도만
- **장점**: 갭 최소, BE 운영 비용 0, 정적 SaaS 단순함 유지
- **단점**: 사용자 cross-device 동기화 불가능, V2 결제·계정 도입 시 재설계 필요
- **외부 사례와의 관계**: 모노레포 구조 정도만 일반 관용 패턴 따름, BE 패턴은 미도입

#### 옵션 B — 자체 BE 도입 (NestJS 스택 채택, games spec 기준 재정의)

- 풀림 생태계 사례를 *참고* 하되, games 의 `proc/spec/01~10` 요구사항에 맞춰 자체 NestJS 11 + TypeORM + Postgres 도입
- entity 후보: `user`, `session`, `card-state` (FSRS), `event`, `streak`, `subscription` (V2 결제) — 시그니처는 games 의 기존 client-side state (zustand store + localStorage) 에서 역추론 + 본 리포 spec 기준 재정의 (외부 리포 코드 직접 import·복사 금지)
- common·bootstrap·filter·interceptor 등 NestJS 표준 패턴은 일반 NestJS 관례를 따르되, games 내부 spec 기준의 계약을 먼저 정의한 뒤 그 계약을 만족하는 형태로 구현 (외부 리포 코드 참조 금지 — 루트 `CLAUDE.md` 룰)
- `apps/backend/` (또는 `apps/games-backend/`) 신설 → 본 plan 의 Phase β
- **장점**: cross-device 동기화 가능, V2 결제 도메인 직결, 4 풀림 공통 NestJS 관용 패턴 유지
- **단점**: 도입 비용 큼, 정적 카탈로그의 단순함 손실
- **외부 사례와의 관계**: 스택만 동일, 도메인 entity·서비스 경계는 games 독립

#### 옵션 C — pullim 본체 backend 흡수 (Studio question-adapter 통합)

- games 가 독립 backend 를 갖지 않고, `curea-co/pullim` 본 리포의 backend (`apps/backend/`, `apps/studio/`) 에 흡수됨
- games 의 카탈로그·메커니즘은 그대로 유지하되, 사용자 state·결제·계정은 pullim 본체 backend 가 책임
- Studio 의 question-adapter (자동 문제 생성) 와 games 의 management 자동 생성 흐름이 통합 — `ANTHROPIC_API_KEY` 도 pullim 본체로 이동
- **장점**: 4 풀림 + pullim 본체 SaaS 통합 (planner 의 종착점과 동일 방향), question pipeline 일원화
- **단점**: pullim 본체 흡수 결정·진척도에 종속 (현재 미정), games 의 독립성 손실
- **planner 와의 동기화 수준**: 최종 종착점 동일 (둘 다 pullim 본체로 흡수)

→ **선택은 사용자 (G1/G3/G4) 합의**. §10 슬롯 1. 본 plan PR 의 PR 본문에 본 절 링크 첨부.

---

## 4. games 의 특수 자산 — 보존 의무 목록

외부 사례를 무비판적으로 모방하면 다음 자산이 손실되거나 변형된다. 본 plan 각 Phase 에 **보존 체크리스트** 로 의무화한다.

| # | 자산 | 위치 | 보존 의무 | 어느 Phase 에서 검증 |
|---|---|---|---|---|
| 1 | 21 게임 카탈로그 | `src/games/<id>/` | 모노레포 후 `apps/games/src/games/<id>/` 그대로 이동. content/logic/components/schema 시그니처 변경 0 | Phase α |
| 2 | 4 메커니즘 컴포넌트 | `src/components/game-mechanics/` | 시그니처 보존 — `QuickQuiz/Blank/Typing/WordMatch` Component + `useAttemptCounter` + `RevealBanner` + `CorrectBurst` | Phase α + 0c |
| 3 | FSRS 단일 백본 | `src/lib/core/fsrs/` + `src/lib/core/fsrs/modes/` | 메모리 룰 `project_architecture_decision` 위반 금지 — 백본 분리·교체 금지 | 모든 Phase |
| 4 | `gen:registry` 자동화 | `scripts/generate-registry.ts` + `package.json` predev/prebuild | 모노레포 후 자동 트리거 보존 — 경로만 갱신 | Phase 0d / α |
| 5 | `ui:audit` HARD gate | `scripts/capture-ui-audit.mjs` + `.pullim-meta/CONVENTION.md §8` (공통 운영 룰) | 4 viewport (320/390/768/1280) audit 보존, UI 변경 PR (`src/components/ui/`, `src/app/**`, `tailwind.config.ts`) 머지 전 의무 | Phase α |
| 6 | `proc/spec/01~10` 권위 | `proc/spec/01-AI-명령지침.md` ~ `10-개발-로드맵.md` | 자체 SPEC 권위 유지 (§5 합의 시까지 손대지 않음) | 모든 Phase |
| 7 | `proc/audit/` 누적 history | `proc/audit/` | 모노레포 후 `apps/games/proc/audit/` 또는 root `proc/audit/` — 사용자 합의 후 결정 | Phase α |
| 8 | viewport 4 audit 룰 | `.pullim-meta/CONVENTION.md §8` | 4 풀림 공통 룰 — 본 plan 작업 중 변경 금지 | 모든 Phase |
| 9 | AI 검증 거버넌스 (codex 회피 금지) | `CLAUDE.md §9` + `AGENTS.md` | 본 plan 작업 중 룰북 회피 금지 — 정당한 명세 진화 경로만 | 모든 Phase |
| 10 | 디자인 토큰 silent fallback 금지 | `tailwind.config.ts` ↔ `proc/spec/08 §8.1` 정합 | Phase 0b·0c 에서 가장 큰 위험 — 토큰 누락 시 시각 회귀 | Phase 0b·0c |
| 11 | 하이퍼캐주얼 룰 | `AGENTS.md "하이퍼캐주얼" 절` + 메모리 룰 `feedback_scale_hypercasual` | 본 plan 모든 단계에서 위반 금지 (RPG·뱃지·재화·시즌 도입 X) | 모든 Phase |
| 12 | 메커니즘 컴포넌트 우선 사용 | `AGENTS.md "4 메커니즘 컴포넌트"` | 직접 게임 컴포넌트 작성 회피 — 본 plan 작업 중 신규 메커니즘 제안 X | 모든 Phase |
| 13 | `ANTHROPIC_API_KEY` 외부 API 흐름 | `src/lib/server/ai/anthropic.ts` + management 자동 생성 | BE 도입 옵션에 따라 위치 결정, 흐름 자체는 보존 | Phase β (옵션 B) 또는 Phase α (옵션 A) |
| 14 | 포트 3033 | `package.json` dev/start script | 모노레포 후에도 `apps/games` 만 3033 | Phase α |

---

## 5. `proc/spec/01~10` 권위 처리 — 사용자 결정 슬롯

games 는 자체 `proc/spec/01~10` 을 권위로 둔다. planner 정렬 시 다음 3 옵션 중 합의 필요:

### 5.1 옵션 A — 그대로 유지 (games 자율성 보존, default)

- `proc/spec/01~10` 을 games 만의 권위로 그대로 둠
- planner 의 `proc/spec/2026-05-18_be-api-design.md` 와는 **별도 spec 트랙**
- 4 풀림 공통 운영룰 (`.pullim-meta/CONVENTION.md`) 만 공유, 도메인 spec 은 각자
- **장점**: games 자율성 보존, BE 옵션 A 와 자연 결합
- **단점**: 4 풀림 spec 통일 불가능, 권위 분기

### 5.2 옵션 B — 부분 흡수 (모노레포 흡수 시)

- `proc/spec/01~10` 중 BE 관련 부분 (09 §9.3 데이터 저장, 09 §9.4 배포) 만 모노레포의 `packages/types/` 또는 root `proc/spec/` 으로 흡수
- 도메인 spec (02~07) 은 games 잔존
- **장점**: BE 옵션 B/C 와 자연 결합
- **단점**: spec 분리 작업 비용 + 권위 경계 모호

### 5.3 옵션 C — 전체 흡수 (4 풀림 통합 spec 트랙)

- `proc/spec/01~10` 을 root 또는 `.pullim-meta/spec/` 로 이전, 4 풀림 공통 spec 트랙 신설
- **장점**: 4 풀림 + pullim 본체 통합 spec
- **단점**: games 의 독립 origin 손실, planner/Q/classbot 도 spec 재구성 필요

→ **선택은 사용자 (G1/G3/G4) 합의**. 본 plan default 는 옵션 A. §10 슬롯 2.

---

## 6. Phase 분할 — 0a → 0d → α → η

각 Phase = 1~2 PR. 각 PR 본문에 본 plan 의 해당 Phase 링크 + 보존 의무 체크리스트(§4) 첨부. **Codex Review 통과 필수** (`CLAUDE.md §9`).

### Phase 0 — 사전 마이그레이션 (games 특유)

#### Phase 0a — Next.js 15 → 16 업그레이드 (1 PR)

**선행 게이트**: 현 `proc/spec/09 §9.1` 은 "표준 Next.js 15.5+ (App Router)" 로 명문화되어 있다. 본 Phase 진입 전 **spec/09 §9.1 변경에 대한 사용자(G1) 합의가 선행되어야 한다** (= 별 spec 갱신 PR 또는 본 plan §10 신설 슬롯). spec 합의 없이 업그레이드 PR 분기 금지.

**목표**: Next.js 16 단일 업그레이드. 모노레포·BE 진입 전.

- `package.json`: `next@^15` → `next@^16`, `eslint-config-next@^15` → `^16`
- breaking change 점검 (학습 데이터 컷오프 이후 변경 가능 — `node_modules/next/dist/docs/` 부재 시 공식 릴리스 노트 참조):
  - App Router 변경 (`generateStaticParams` 패턴, `params` Promise 화)
  - `next.config.ts` 옵션 변경 (현 `distDir`, `devIndicators` 보존)
  - middleware·route handler 시그니처 변경 여부
- `next-env.d.ts` 재생성
- `eslint.config.mjs` next-eslint 호환 검증
- 21 게임 회귀 검증 — 각 게임 진입 → 첫 카드 풀이 → 정답·오답·5회 오답 reveal 흐름 동작 확인
- **`bun run ui:audit`** — `.pullim-meta/CONVENTION.md §8` viewport rule 적용 대상 전 경로(`src/app/**`, `src/components/ui/`, `tailwind.config.ts` 변경 동반 시 포함) 4 viewport HARD gate (§4 #5)
- **완료 기준**: `bun run typecheck && bun run lint && bun test && bun run build` 통과, 21 게임 진입 회귀 0, ui:audit critical overflow 0
- **spec 갱신 분리 원칙**: spec/09 §9.1 본문 갱신은 *본 PR 과 묶지 않고* 선행 별 PR 또는 후속 별 PR 로 분리 (루트 `CLAUDE.md §8` 컨벤션 파일 분리 규칙)

**리스크**: Next.js 16 의 RSC 패턴 변경 → 21 게임 중 client-only 컴포넌트(`'use client'` 보유) 의 hydration 검증 필요.

#### Phase 0b — Tailwind 3 → 4 마이그레이션 (1 PR)

**목표**: Tailwind 4 CSS-first config 전환. shadcn 재발급(0c) 직전에 토대 마련.

- `package.json`: `tailwindcss@^3.4` → `^4`, `autoprefixer` 제거, `@tailwindcss/postcss@^4` 추가
- `postcss.config.mjs`: `tailwindcss` + `autoprefixer` → `@tailwindcss/postcss` 단일 플러그인
- `tailwind.config.ts` → **CSS-first 로 전환** (`@theme` block in `src/app/globals.css`)
  - 현 `pullim-slate-{50~900}`, `pullim-blue-{50~700}`, `pullim-danger`, `accent-positive/negative`, `bg-primary/block`, `border-hairline`, `type-primary/secondary` 모두 `@theme` 으로 이전
  - 현 `borderRadius` (`block: 4px`, `button: 6px`, `dropzone: 8px`, `modal: 16px`) 보존
  - 현 `boxShadow`, `fontFamily`, `fontSize`, `transitionTimingFunction`, `keyframes`, `animation` 보존
- `tailwind.config.ts` 자체는 v4 호환 stub 으로 축소 또는 제거 (content 경로는 `@source` directive 로 globals.css 이전)
- **silent fallback 방지** — `proc/spec/08 §8.1` 토큰과 `@theme` 정의 1:1 정합. 누락 검출 위해 `tailwind.config.ts` diff + 21 게임 ui:audit 비교
- `src/app/globals.css` Tailwind v4 import 패턴 (`@import "tailwindcss"`)
- 21 게임 회귀 검증 + ui:audit
- spec/08 §8.1 본문 갱신 (Tailwind 3 → 4 표기, `@theme` 경로 명시)
- **완료 기준**: `bun run build` 통과, 21 게임 색상·여백·radius·shadow·typography 픽셀 회귀 0 (4 viewport 캡처 첨부)

**리스크**: 
- Tailwind 4 의 `oklch` 색공간 기본화 → 현 hex 토큰(`#F8FAFC` 등) 의 색역 변환 정합성 검증 필요
- `@tailwindcss/postcss` 와 Next.js 15 의 PostCSS pipeline 충돌 가능 — Phase 0a 후 진입이 안전
- shadcn `new-york/slate/cssVar:false` 가 Tailwind 4 호환 → shadcn 재발급 전이라도 동작 검증

#### Phase 0c — shadcn 재발급 (`new-york/slate/cssVar:false` → `base-nova/neutral/cssVar:true`) (1~2 PR)

**선행 게이트**: 현 `proc/spec/08 §8.x` (디자인 시스템) 에 shadcn 라인 변경 합의 선행. 합의 없이는 본 Phase 진입 금지.

**목표**: games spec 이 요구하는 디자인 시스템 속성 — `cssVariables:true` 기반 토큰 인터페이스, `@theme` 호환, 외부 디자인 토큰 공급 수용 가능 — 을 만족하도록 shadcn 라인을 재발급. 특정 외부 도메인의 현재 구성을 정답으로 고정하지 않으며, **21 게임 시각 회귀 위험이 가장 큰 단계**.

- `components.json` 갱신:
  - `style`: `new-york` → `base-nova`
  - `tailwind.baseColor`: `slate` → `neutral`
  - `tailwind.cssVariables`: `false` → `true`
  - `tailwind.config` 비우기 (Tailwind 4 와 정합)
  - `menuColor`, `menuAccent`, `rtl` 등 추가 필드는 games spec 요구사항 기준으로 결정
- `src/components/ui/*` 재발급 — `src/components/ui/` 디렉토리 내 모든 파일 (현재 기준 — 변경될 수 있으므로 경로 기준 점검) 을 `bunx shadcn@latest add` 로 base-nova 라인 재생성
- `bg-*`, `text-*`, `border-*` 등 shadcn 토큰을 사용하는 모든 곳 검증 — `cssVariables:true` 로 인터페이스 변경 (Tailwind class → CSS var) 시 직접 import 영향 추적
- spec/08 §8.1 의 `pullim-slate-*`, `pullim-blue-*` 등 자체 토큰은 그대로 유지 (shadcn 토큰과 병존)
- **단계적 확인 의무**:
  1. ui 프리미티브 1개씩 (`button` → `input` → `dialog` → ...) 재발급 → 21 게임 중 사용처 spot check → 회귀 0 확인 → 다음 컴포넌트
  2. 4 viewport ui:audit 매 컴포넌트 단위로
  3. `proc/audit/` 에 `2026-MM-DD_phase-0c-shadcn-migration-audit.md` 신설 — 각 컴포넌트 before/after 캡처 첨부
- spec/08 § (디자인 시스템) 본문 갱신
- **완료 기준**: 21 게임 + game-shell + game-hub + dashboard + manage 시각 회귀 0 (1:1 픽셀 diff 까지는 아니더라도 hierarchy·spacing·color 의도 보존)

**리스크 (HIGH)**:
- `new-york` ↔ `base-nova` 의 spacing·border-radius·shadow 디폴트가 다름 → 21 게임 시각 회귀 광범위
- `cssVariables:true` 전환 시 Tailwind class 와 CSS var 의 중복·충돌 → spec/08 §8.4 의 border-radius 룰 (`16px+` 금지) 위반 가능
- 단계적 확인 미준수 시 한 PR 에 회귀 검출 불가 → **PR 분할 의무**

#### Phase 0d — `gen:registry` 자동화 보존 (1 PR, 모노레포 전환 직전)

**목표**: 모노레포 전환 후에도 `bun run gen:registry` 가 predev/prebuild 에서 동작하도록 경로 갱신 사전 검토.

- 모노레포 후 `apps/games/scripts/generate-registry.ts` (가장 자연) vs `packages/games-registry/` (재사용 가능) 결정
- 현 `src/games/*/manifest.ts` glob → 모노레포 후 `apps/games/src/games/*/manifest.ts` 갱신
- 현 출력 `src/lib/games/registry.generated.ts` → `apps/games/src/lib/games/registry.generated.ts`
- CI 의 `git diff --exit-code` 검증 (registry 일치) 도 경로 갱신
- **결정**: 본 plan default 는 `apps/games/scripts/` (단순), `packages/games-registry/` 는 옵션 — 사용자 결정 슬롯 §10 슬롯 3
- 본 Phase 자체는 코드 변경 0 (결정만), 실제 경로 갱신은 Phase α PR 에 합쳐서

→ Phase 0a/0b/0c 머지 후 Phase α 진입.

### Phase α — 모노레포 재편 (구조 재편 1 PR + 컨벤션 문서 갱신 1 PR, 분리 의무)

**목표**: 외부 사례를 *참고* 하되, games spec 기준으로 모노레포 재편. 동작 회귀 없이 구조만 재편.

**Phase α-1 — 구조 재편 PR (코드·설정 변경)**

- `apps/games/` 생성, 기존 `src/`, `public/`(있다면), `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `e2e/`, `playwright.config.ts`, `vitest.config.ts` 등을 모두 이동
- `apps/games/proc/` 또는 root `proc/` — §10 슬롯 4 (audit 폴더 + spec 폴더 위치 결정)
- `packages/types/` 빈 placeholder (BE 옵션 B 시점에 본격)
- `packages/ui/` — 본 plan default 미생성 (옵션)
- bun workspace 셋업 (`package.json` workspaces 필드)
- `turbo.json` 신규 + `tsconfig.base.json` 신규
- **`gen:registry` 경로 갱신** (Phase 0d 결정에 따라)
- **`ui:audit` 경로 갱신** (`apps/games/scripts/capture-ui-audit.mjs`)
- 포트 3033 보존 (`apps/games/package.json` dev/start)
- README.md 갱신은 본 PR 포함 가능 (운영 컨벤션 룰 아님)
- **본 plan 의 보존 의무 §4 #1, 2, 4, 5, 7, 14 검증**
- **완료 기준**: `bun run dev:games` 정상 부팅 + 21 게임 진입 회귀 0 + ui:audit HARD gate 통과

**Phase α-2 — 컨벤션 문서 갱신 PR (별 PR, 루트 `CLAUDE.md §8` 분리 규칙)**

- `CLAUDE.md` / `AGENTS.md` 갱신 — 모노레포 구조 반영, games 의 자율성·자체 spec 권위 재확인
- α-1 머지 후 분리된 PR 로 진행 (코드 변경 PR 과 컨벤션 변경 PR 의 리뷰 경계 보존)

### Phase β — BE 도입 (옵션 B/C 합의 시만, 1~N PR)

**목표**: §3.2 옵션 B 채택 시 games spec 기준 자체 NestJS BE 도입 진행. 옵션 A 시 본 Phase 스킵, 옵션 C 시 pullim 본체 흡수 trace 만.

- **옵션 B 진입 시**:
  - `apps/backend/` 신설 (NestJS 11 + TypeORM + Postgres) — games spec 기준으로 NestJS 표준 패턴(common·bootstrap·filter·interceptor) 자체 정의 (외부 리포 코드 복사 금지)
  - `apps/backend/src/modules/games/` — entity (user/session/card-state/event/streak) + use-case + service + repository, 시그니처는 games spec + zustand store + localStorage 에서 역추론
  - `apps/backend/src/modules/games/ai/` — `ANTHROPIC_API_KEY` 흐름 이전 위치 결정 (§10 슬롯 8, management 자동 생성 흐름 보존)
  - mock 부재 → entity 시그니처는 본 리포 client-side state 에서 역추론 (별 spec PR 1건 선행)
  - `packages/api-client/` + `packages/auth/` 본격 (필요 시)
  - FE → `apps/games/` 가 `@pullim-games/api-client` 만 import (Phase η)
- **옵션 C 진입 시**:
  - pullim 본체 흡수 결정 trace 만 본 plan §3.2 옵션 C 에 누적
  - 본 리포에서는 BE 신설 없음, pullim 본체 진척에 종속

### Phase γ — FE 컨벤션 합의 (옵션) (1 PR)

**목표**: planner 의 Container/Presenter + `features/<domain>/` 컨벤션을 games 에 도입할지 결정.

- games 의 현 컨벤션: `src/games/<id>/` (단일 게임 단위) + `src/components/game-mechanics/` (4 메커니즘) + `src/components/game-shell/`, `game-hub/`, `dashboard/`
- planner Container/Presenter 컨벤션을 games 에 도입하면:
  - `src/components/features/game-hub/{containers,presenters,components}/` 등으로 재편
  - **단**, games 의 21 게임은 이미 `src/games/<id>/{component.tsx, content, logic, schema.ts, manifest.ts}` 의 자체 구조 — 이 구조와 Container/Presenter 가 정합되는지 검증 필요
- **선택**: 사용자 결정 슬롯 §10 슬롯 5
- 본 plan default 는 **도입 보류** (games 의 자체 구조가 이미 강한 layer 분리). 도입 시 별 plan 분기.

### Phase δ — 자체 SPEC 권위 처리 (옵션) (1 PR)

§5 옵션 A/B/C 합의 후 진입. default 옵션 A 는 본 Phase 자체 불필요.

### Phase ε~η — BE 도입 후 FE 전환 (옵션 B/C 진입 시만)

games 의 client-side FSRS state → server state 전환. 본 plan 에서는 상세 미확정 (BE 옵션 결정 후 별 plan 분기).

---

## 7. 리스크 매트릭스 + 사전 결정

| # | 리스크 | 영향 | Phase | 대응 |
|---|---|---|---|---|
| R1 | **Tailwind 4 silent fallback** — `@theme` 누락 시 클래스 자체가 사라져 시각 회귀가 PR diff 에서 안 보임 | 21 게임 전체 시각 회귀 | 0b | spec/08 §8.1 ↔ `@theme` 1:1 정합 체크리스트 + `bun run ui:audit` 4 viewport HARD gate. Phase 0b PR 본문에 회귀 0 증거 의무 |
| R2 | **shadcn 재발급 시각 회귀** — `new-york → base-nova` + `slate → neutral` + `cssVar:false → true` 동시 전환 | 21 게임 전체 시각 회귀 (특히 dialog/button/input) | 0c | **PR 분할 의무** (컴포넌트 1개씩) + 매 컴포넌트 ui:audit + `proc/audit/` 누적 |
| R3 | **Next.js 16 hydration 변경** — RSC 패턴 변경 시 `'use client'` 보유 게임 컴포넌트 hydration mismatch | 21 게임 중 client-only 컴포넌트 동작 회귀 | 0a | 21 게임 진입 회귀 검증 + `bun run test:e2e` 통과 의무. 회귀 1건이라도 발견 시 PR 차단 |
| R4 | **`gen:registry` 경로 미갱신** — 모노레포 후 predev/prebuild 트리거 누락 시 dev 진입 자체 실패 | 모든 dev 진입 실패 | 0d / α | Phase α PR 의 `bun run dev` 정상 부팅이 완료 기준 — CI 에서 `bun run gen:registry && git diff --exit-code` 검증 |
| R5 | **BE 옵션 미결정 상태로 Phase α 진입** | Phase α 후 BE 도입 방향 결정 시 모노레포 구조 재재편 필요 | 0d ↔ α 사이 | §10 슬롯 1 (BE 옵션) 의 *큰 갈래* (옵션 A vs B) 합의 후 Phase α 진입 — Phase α 게이트. 세부 entity·common 패턴은 Phase β 게이트. 옵션 A 시 `apps/backend/` 미생성 결정 명문화. (현 §12 결정: 옵션 B 확정 → Phase α 진입 가능) |
| R6 | **자체 SPEC `01~10` 의도치 않은 변형** | games 권위 문서 표류 → claude·codex 판단 혼란 | 모든 Phase | 본 plan 작업 중 spec/01~10 직접 수정 금지. spec 갱신은 **별 PR + 정당한 명세 진화 경로** (`CLAUDE.md §9`) 만 허용 |
| R7 | **codex review 회피 시도** — 모노레포·shadcn 재발급에서 룰북 회피 유혹 | AI 검증 거버넌스 위반 (`CLAUDE.md §9`) | 모든 Phase | 본 plan 명시 — 회피 금지. 정당한 명세 진화 경로만. PR 본문에 본 룰 링크 |
| R8 | **viewport 4 audit 누락** — UI 변경 PR 에서 ui:audit 첨부 누락 시 HARD gate 위반 | `.pullim-meta/CONVENTION.md §8` 위반 | 0a, 0b, 0c, α | 각 PR 본문에 `bun run ui:audit <path>` 결과 첨부 의무. 본 plan PR 자체는 코드 변경 0 이라 면제 |
| R9 | **하이퍼캐주얼 룰 위반 유혹** — BE 도입 시 score·badge·level·currency entity 도입 유혹 | 메모리 룰 `feedback_scale_hypercasual` 위반 | β (옵션 B) | BE entity 정의 시 본 plan §4 #11 보존 의무 명시. score/badge/level/currency entity 도입 금지 |
| R10 | **단일 FSRS 백본 분리 시도** — BE 도입 시 game 별 백본 분리 유혹 | 메모리 룰 `project_architecture_decision` 위반 | β (옵션 B) | BE entity 정의 시 `card-state` 단일 entity, game-id 는 컬럼으로 — 백본 분리 entity 도입 금지 |
| R11 | **포트 3033 → 3030 충돌** — 모노레포 후 의도치 않게 3030 사용 시 4 풀림 동시 dev 시 충돌 | 4 풀림 dev workflow 손상 | α | Phase α PR 의 `apps/games/package.json` dev/start 에 `-p 3033` 보존 검증 |
| R12 | **본 plan 자체의 진척 중 사용자 우선순위 변동** | Phase 정체 | 모든 Phase | Phase 별 PR 분할 + 각 PR 본문에서 본 plan §6 단계 링크. 사용자 stop 가능 시점 명문화 |

### 7.1 사전 결정 (claude 자동, 사용자 합의 불필요)

| 결정 | 근거 |
|---|---|
| Phase 0a/0b/0c 순서 = Next.js → Tailwind → shadcn | 의존성 방향: shadcn 은 Tailwind 4 호환 필요, Tailwind 4 는 Next.js postcss pipeline 의존 |
| Phase 0d 는 결정만, 실제 적용은 Phase α PR 에 합침 | 단독 PR 가치 낮음 (변경 0). 결정 trace 만 보존 |
| 본 plan default BE 옵션 = A (BE 미도입) | 옵션 B/C 는 사용자 합의 의무. default 옵션 A 는 정렬 비용 최소화 |
| 본 plan default `proc/spec/01~10` 처리 = 옵션 A (그대로 유지) | 자율성 보존 우선 |
| 본 plan default `gen:registry` 위치 = `apps/games/scripts/` | 단순성 우선. `packages/games-registry/` 는 다른 풀림이 이 registry 를 import 할 때만 의미 있음 — 현 4 풀림 중 그런 사례 없음 |

### 7.2 게이트키퍼 합의 포인트

- **G1 (대표)** — BE 옵션 A/B/C, spec 권위 처리 옵션 A/B/C 가장 큰 갈래 결정
- **G3 (BE 게이트키퍼)** — BE 옵션 B/C 진입 시 entity 시그니처·common 패턴 재정의 범위
- **G4 (FE 게이트키퍼)** — Phase 0c shadcn 재발급 시각 회귀 0 검증, Container/Presenter 도입 여부 (Phase γ)

본 plan PR (= 본 문서 추가) 자체에는 합의 게이트 없음 — 정렬 로드맵 문서화이므로 G1/G3/G4 1차 review 만.

---

## 8. PR 머지 정책

- 본 plan PR: Codex Review 통과 + 사용자 1차 review 후 머지. 코드 변경 0
- 후속 Phase PR: 매 PR Codex Review 통과 의무 (`CLAUDE.md §9` AI 검증 거버넌스)
- 후속 Phase PR: UI 변경 동반 시 `bun run ui:audit` 결과 첨부 의무 (R8)
- 머지 후 production 자동 배포 금지 — PM 명시 슬롯에서만 (메모리 룰 [feedback_verify_in_browser])
- 각 Phase PR 머지 시 본 plan 파일에 진척 체크 추가
- 본 plan 의 archive 이동 — 사용자 명시 시점까지 `proc/plan/` 잔존

---

## 9. 본 plan 의 완료 정의

§0 "완료 정의" 4 줄 모두 충족 시 — 사용자 명시("archive 로 옮겨")가 있을 때만 `proc/archive/plan/2026-05-27_planner-alignment.md` 로 이동 (메모리 룰 [feedback_plan_archive]).

---

## 10. 사용자 결정 필요 (G1/G3/G4 합의)

본 plan 진척에 필수인 결정 슬롯. 본 plan PR 머지 후 사용자가 슬롯별로 합의해야 후속 Phase 진입 가능.

> **상태 갱신 주의**: 일부 슬롯은 §11·§12 에서 사용자가 이미 확정했다. 본 표의 "default" 컬럼은 *원안* 이며, **현재 상태** 컬럼이 실제 의사결정 상태이다 (§12 변경이 우선). 후속 작업자는 "현재 상태" 를 따른다.

| # | 슬롯 | 옵션 | default (원안) | 현재 상태 | 진입 차단 Phase |
|---|---|---|---|---|---|
| 1 | **BE 도입 옵션** (§3.2) | A (미도입) / B (자체 NestJS BE) / C (pullim 본체 흡수) | A | **B 확정** (§12.1, C 폐기 §11.3) | Phase β |
| 2 | **`proc/spec/01~10` 권위 처리** (§5) | A (유지) / B (부분 흡수) / C (전체 흡수) | A | (미정 — default 유지) | Phase δ |
| 3 | **`gen:registry` 위치** (Phase 0d) | `apps/games/scripts/` / `packages/games-registry/` | `apps/games/scripts/` | (미정 — default 유지) | Phase α |
| 4 | **`proc/audit/` 위치** (Phase α) | `apps/games/proc/audit/` / root `proc/audit/` | `apps/games/proc/audit/` | (미정 — default 유지) | Phase α |
| 5 | **FE Container/Presenter 도입** (Phase γ) | 도입 / 보류 | 보류 | (미정 — default 유지) | Phase γ |
| 6 | **`packages/ui/` 신설 여부** | 신설 / 미신설 | 미신설 (필요 시 옵션) | (미정 — default 유지) | Phase α |
| 7 | **`packages/games-registry/` 신설 여부** | 슬롯 3 종속 — `packages/games-registry/` 선택 시 자동 신설 | 미신설 | (슬롯 3 종속) | Phase α |
| 8 | **`ANTHROPIC_API_KEY` 흐름의 BE 이전 위치** (BE 옵션 B 시) | `apps/backend/src/modules/games/ai/` / `apps/games/` 의 서버 액션 경로 잔존 | `apps/backend/` (옵션 B 종속) | (활성화 — 옵션 B 확정으로) | Phase β |
| 9 | **본 plan 진입 시점** — 진행 중 별 PR 마무리 후 진입 확인 | 사용자 안내 대기 | (사용자 안내) | (대기) | Phase 0a |

→ 본 plan PR 본문에 슬롯 1·2·9 의 합의 요청 명시. 슬롯 1 은 §12.1 에서 옵션 B 확정으로 해소됨.

---

## (다음 단계 — §12.3 에 통합됨)

본 plan 머지 + §10 슬롯 2·9 합의 후 — Phase 0a (Next.js 15→16) 진입. 진입 시 작업 순서는 §12.3 참조. 슬롯 1 은 §12.1 에서 옵션 B 확정.

---

## 11. 사용자 결정 (2026-05-27 — games 에 영향을 미치는 한도 내에서)

> **범위 주의**: 본 절은 **games 리포의 후속 작업에 영향을 미치는 한도** 에서 사용자 결정을 기록한다. 풀림 생태계 전반의 거버넌스 결정 (arcade·pullim 본체·`@pullim/design-tokens` 패키지 호스팅 등) 은 본 리포의 권위 범위 밖이며, 정식 기록은 별도 상위 계획 문서 (예: 풀림 본체 리포 또는 `pullim-meta` 공간) 로 이관되어야 한다. 본 절에 적힌 외부 도메인 정책은 **games 가 자신의 작업을 결정하기 위해 필요한 전제** 로만 사용된다.

### 11.1 도메인 분류 (games 의 위치만 기록)

games 는 풀림 생태계 안에서 **독립 운영 (별개 제품, pullim 본체 흡수 대상 아님)** 위치에 있다는 사용자 확인을 받았다. 이 위치는 본 plan 의 BE 옵션 결정과 spec 자율성 보존 (§5) 의 전제. 다른 도메인 (planner/Q/classbot/studio/store/arcade) 의 통합·운영 분류는 본 plan 의 권위 범위가 아니므로 정식 표는 별도 상위 계획 문서에 둔다.

### 11.2 games 운영 정책 3 결정 (사용자 확정)

| # | 영역 | 결정 (games 시점) |
|---|---|---|
| 1 | **타 도메인과의 데이터 공유** | **데이터 공유 0** — games 의 사용자·진척도·FSRS state 는 본 리포 내부 자산. 외부 도메인과의 데이터 교환 채널 미도입. |
| 2 | **인증** | **게스트 우선** — 비로그인 사용 가능. 로그인은 진척도·디바이스 동기화 용도. 외부 SSO 통합은 선택. |
| 3 | **디자인 시스템** | **공통 토큰 사용 + 컴포넌트 자율** — 색·타이포·간격 토큰은 외부 공급 (별 plan, §11.5) 의 *결정 결과 를 따름*. shadcn 컴포넌트는 자체 보유. games 내부에 디자인 시스템 패키지 흡수 안 함. |

### 11.3 자동 폐기된 옵션 (games 의 후속 작업 결정에 영향)

- ❌ BE 옵션 C — pullim 본체 흡수 (독립 운영 결정으로 폐기, §3.2)
- ❌ 본체 SSO 강제 (게스트 우선 결정으로 옵션화)
- ❌ games 내부에 외부 디자인 시스템 패키지 도입 (컴포넌트 자율 결정으로 폐기)
- ❌ games 의 사용자 / 진척도 데이터를 외부 도메인과 공유 (데이터 독립 결정으로 폐기)

### 11.4 자동으로 영향받는 후속 결정

**BE 옵션 (남은 A vs B)** — 게스트 우선 결정의 함의:

| 옵션 | 게스트 모드 | 로그인 모드 | 비고 |
|---|---|---|---|
| **A. BE 미도입** | localStorage | localStorage (디바이스 동기화 X) | 진척도 의미 약화 |
| **B. 자체 NestJS BE** | localStorage + 익명 세션 | 서버 보관 + 디바이스 동기화 | 사용자 정착 시 가치 큼 |

→ "게스트 우선 + 로그인 시 진척도 보관" 정책으로 **옵션 B 가 자연스러움**. 단 진입 시점은 별 결정 (Phase 0a-d 마이그레이션 + 모노레포 재편 후로 미룰지 / 동시 진행할지).

### 11.5 디자인 토큰 공급 방식 — games 가 *수요자* 로서 따를 옵션

"공통 토큰 사용" 결정에 따라 games 는 다음 중 어떤 공급 방식이 외부에서 채택되든 *수용 가능* 한 형태로 자체 토큰 인터페이스를 설계해 둔다 (구체 선택은 본 리포 권위 밖):

- a. 외부 npm 패키지 의존 (e.g. `@pullim/design-tokens`)
- b. CSS 변수 파일 동기화
- c. Tailwind preset 공유

games 시점의 작업 요구사항: 어떤 옵션이든 `proc/spec/08 §8.1` 토큰과 1:1 정합이 보장되어야 함. 패키지 호스팅·발행 정책 자체는 본 plan 범위 밖, 별도 상위 계획 문서로 이관.

### 11.6 다음 진입 단계 (games 한정)

1. BE 옵션 A vs B 결정 (위 §11.4) — §12 에서 옵션 B 확정
2. 디자인 토큰 공급 방식 외부 결정 대기 (위 §11.5) — games 는 수요자 측 인터페이스만 준비
3. Phase 0a (Next.js 15→16) 진입 — `proc/spec/09 §9.1` 변경 합의 + 진행 중 별 PR 마감 후

---

## 12. 사용자 결정 — games 의 BE 옵션 + 진입 시점 (2026-05-27 후속)

> **범위**: 본 절은 games 의 후속 작업 결정만 기록한다. 다른 도메인의 같은 종류 결정은 본 리포의 권위 범위가 아니므로 별도 상위 계획 문서로 이관.

### 12.1 games BE 옵션 — 옵션 B 확정

| 도메인 | 결정 |
|---|---|
| games | **B. 자체 NestJS BE 도입** (§3.2 옵션 B) |

함의:
- 게스트 모드 = localStorage (인증 없이 진척도 임시 저장)
- 로그인 시 = 서버 진척도 + 디바이스 동기화 (`POST /api/progress/sync` 류 — 정식 라우트 시그니처는 별 spec PR)
- 스택: NestJS 11 + TypeORM + Postgres. 인증은 Mock 헤더 + Cls 시작, **Redis·JWT 는 후속 결정**.
- games BE 는 본 리포 spec 기준 자체 정의 (§3.2 옵션 B 의 외부 코드 직접 참조 금지 원칙 재확인)

진입 순서:
- Phase α (모노레포) → β (BE common) → γ (entity) → δ (read) → ε (mutation) → η (FE 전환)
- 게스트 모드는 Phase γ 이전에도 동작 — Phase η 까지 무로그인 사용 보장

### 12.2 디자인 토큰 — games 는 수요자 인터페이스만 유지

games 시점의 의무는 단 하나: 외부에서 어떤 공급 방식이 결정되든 그것을 *수용 가능한* 토큰 인터페이스를 유지한다 (Phase 0b 의 Tailwind 4 `@theme` 설계 시 외부 토큰 소스 import 호환 구조). 어떤 공급 방식이 채택되는지, 호스팅 위치가 어디인지, 발행 정책은 어떠한지 등의 *생태계 결정* 은 본 plan 의 권위 범위 밖이며 별도 상위 계획 문서에서 추적한다 (링크는 결정 확정 시 추가).

### 12.3 진입 시점 (games)

| 단계 | 시점 |
|---|---|
| games Phase 0a (Next.js 15→16) | `proc/spec/09 §9.1` 변경 합의 + 진행 중 별 PR 마무리 후 |
| games Phase α (모노레포) | Phase 0a/0b/0c/0d 머지 후, §10 슬롯 1 큰 갈래 합의 후 (현재 옵션 B 확정으로 충족) |
| games Phase β (BE common) | Phase α 머지 후 |

(다른 도메인의 진입 시점은 본 plan 의 권위 범위 밖.)

### 12.4 게임 후속 결정 사안 (이번 결정으로 새로 발생, games 시점)

- **BE 인프라 호스팅** (games BE) — Vercel Functions 부적합 (stateful) → AWS ECS / Fly.io / Render / Railway 중 결정 필요. §10 신설 슬롯 (예: 슬롯 10) 으로 게이트.
- **DB 호스팅** (games BE) — RDS / Supabase / Neon / Vercel Postgres 중 결정. §10 신설 슬롯 (예: 슬롯 11).
- **`ANTHROPIC_API_KEY` 흐름의 BE 이전 여부** — §10 슬롯 8 재확인 (옵션 B 확정으로 활성화).
- **mock 헤더 → 정식 인증 전환 시점** (게스트 → 로그인) — Phase η 또는 별 plan.
- 디자인 토큰 패키지의 호스팅 위치 등 *생태계 결정* 은 별도 상위 계획 문서.
