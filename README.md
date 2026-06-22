# 풀림 게임즈

학습 게임 카탈로그. 풀림 시리즈 중 **독립 프로젝트**이며, `pullim-planner` / `pullim-Q` / `pullim-classbot`과 달리 `pullim-study-demo` 추출본이 아니다.

> 공통 운영 규칙: [`~/dev_git/.pullim-meta/CONVENTION.md`](../.pullim-meta/CONVENTION.md)
>
> 프로젝트 작업 가이드: [`CLAUDE.md`](CLAUDE.md)

## 21개 게임 × 4 메커니즘

**4 메커니즘** (재사용 가능한 컴포넌트):
- **QuickQuiz** — 4지선다
- **Blank** — 빈칸 채우기
- **Typing** — 타이핑 입력
- **WordMatch** — 짝 맞추기

**21개 게임** (`apps/games/games/`):
```
bio-taxonomy            chemistry-balance       cloze-multi
custom-blank            custom-multiple-choice  custom-typing
custom-word-match       english-blank           english-order
english-vocab-typing    english-word-match      factorization
genetics-punnett        history-timeline        image-hotspot
korean-pos-tagging      letter-assembly         math-graph-shift
math-quick-quiz         physics-vector          vocab-typing
```

5회 오답 시 `useAttemptCounter` → `RevealBanner`로 정답 공개, 정답 시 `CorrectBurst` 공통 피드백.

## 구조

**Turborepo 모노레포** (2026-06-17~) — planner/Q 와 동형 토폴로지. 앱은 `apps/games/`.
thin monorepo: `apps/backend`·`packages/*` 미생성(BE 는 별 repo `pullim-api`).

```
pullim-games/                    # 모노레포 루트
├── package.json                 # workspaces:["apps/*","packages/*"], scripts=turbo
├── turbo.json · tsconfig.base.json
├── docker-compose.yml · bun.lock
├── input/             # 입력 자산 (아이콘 시안, 로고)
├── output/            # 산출물
├── proc/              # SPARK 워크플로우 (spec/plan/archive/research/audit)
├── daily_outcome/     # PM 일일 보고 (CONVENTION.md 기반)
├── .github/workflows/ # ci · e2e-nightly · codex-review
└── apps/
    └── games/                   # ← 앱 본체 (@pullim-games/games, 포트 3033)
        ├── package.json next.config.ts tsconfig.json tailwind.config.ts
        ├── e2e/                 # playwright e2e
        ├── scripts/generate-registry.ts   # 레지스트리 자동 생성 (predev/prebuild)
        ├── public/
        ├── app/                 # games/, manage/, api/ · layout/page · manifest 등 (src/ 래퍼 없음 — Q/planner 정합)
        ├── components/          # shell·game-shell·game-hub·dashboard·game-mechanics·manage·ui
        ├── games/{21개 게임}/    # 게임별 components/, content/, schema/, checkAnswer
        └── lib/{core,games,server,utils.ts}/
```

## 시작

```bash
bun install
bun dev          # http://localhost:3033 — predev에서 gen:registry 자동 실행
```

## 명령

```bash
bun dev               # 개발 서버 (포트 3033)
bun run build         # production 빌드
bun run gen:registry  # 게임 레지스트리 수동 갱신
bun run typecheck     # turbo → tsc --noEmit (apps/games)
bun run lint          # eslint
bun test              # vitest
bun run test:e2e      # playwright
bun run test:e2e:ui   # playwright UI 모드
bunx vercel --prod    # production 배포 (수동 — webhook 자동 배포 사용 안 함)
```

## 기술 스택

- **런타임/패키지 매니저**: Bun
- **프레임워크**: Next.js **15** + React 19 + TypeScript
- **스타일**: TailwindCSS + shadcn/ui + Radix UI
- **애니메이션**: framer-motion
- **수식**: mathjs
- **AI**: @anthropic-ai/sdk
- **테스트**: vitest (단위) + playwright (e2e)

> 다른 풀림 프로젝트는 Next.js 16. games는 15에 머물러 있음 — 통일 결정은 [`DECISIONS.md`](../.pullim-meta/DECISIONS.md) D4 참조.

## 다른 풀림 프로젝트와의 관계

| 항목 | games | planner / Q / classbot |
|---|---|---|
| origin | 독립 프로젝트 | `pullim-study-demo` 추출본 |
| Next.js | 15 | 16 |
| 포트 | 3033 | 3030 |
| 권위 문서 | `proc/spec/01~10` | `input/docs-archive/*.md` |
| proc 5번째 폴더 | `audit/` | `knowhow/` |

cross-domain 의존 금지 — games 안에서 다른 풀림 프로젝트의 코드·페이지·mock 참조하지 않는다.

## 권위 문서

`proc/spec/01-AI-명령지침.md` ~ `proc/spec/10-개발-로드맵.md` (10건). 자세한 영역별 매핑은 [`CLAUDE.md`](CLAUDE.md) §3 참조.

## 배포

`bunx vercel --prod` 수동 배포가 공식 프로세스. GitHub webhook 자동 배포는 Vercel admin 권한 이슈로 사용 안 함. **PR 머지 ≠ production 반영** — 수동 배포 완료까지가 1사이클.
