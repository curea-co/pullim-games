# games 모노레포 구조 정렬 (Turborepo) — restructure plan

**작성일**: 2026-06-17
**작성자**: 사용자(G1) 지시 + claude
**상태**: **실행 완료 — PR #120 (base `feat/curriculum-phase1`, stacked). codex review 대기.** 로컬 검증 green(typecheck·lint·build·471 tests·ui:audit·e2e subset).

**사용자 결정 (2026-06-17)**:
- D3/D4: **thin monorepo 확정.** backend는 **별도 repo `pullim-api`에 적재** → games엔 `apps/backend`·`packages/*` 영구 미생성.
- D5: **게이트 승인 무시하고 진행** (사용자 G1 직접 — "의미 없음"). CONVENTION §3.1·T-UI 경로 갱신을 본 작업에 포함. (CLAUDE §8 분리 원칙상 `.pullim-meta` 변경은 별 commit 으로.)
**근거**: 사용자 지시(2026-06-17 "기형적 구조 손봐라") + `.pullim-meta/2026-05-27_canonical-stack-alignment.md` §16.5(코드/디렉토리/CI 구조는 지금 정본과 동형으로 — 보류 대상은 AWS 물리 인프라뿐) + G2 갭("games 모노레포 전환 선행 필요")
**완료 정의**: §작업항목 전 항목 ✅ + tsc/lint/build/test/e2e green + 4-viewport audit critical 0

---

## 0. 배경 — 왜 "기형"인가 (사실 정정 포함)

| | planner / Q | arcade (직접 형제) | games (현재) | games (목표) |
|---|---|---|---|---|
| 형태 | 모노레포(apps/+packages/+turbo) | 단일앱 `src/` | **단일앱 `src/`** | 모노레포(apps/+turbo) |
| 계열 | study-demo 추출본 | 독립 games 패밀리 | 독립 games 패밀리 | — |

- planner/Q가 모노레포인 건 **다른 계열(추출본)**이라 그렇다. 너의 직접 형제 arcade는 너처럼 단일앱이다 → "단일앱 자체"는 기형이 아니다.
- **그러나** canonical-stack §16.5 + G2 갭은 5 도메인 **디렉토리 구조 동형화**(모노레포 토폴로지)를 명시 권장한다. 물리 AWS 인프라(ECS/RDS)만 무기한 보류이고 **디렉토리 모노레포화는 지금 진행 정당**. arcade도 §16 상 "Phase 1 mini-monorepo" 대기 상태 — games가 선행 가능.
- 따라서 본 작업은 **Turborepo 토폴로지로 동형화**가 목표. 게임 도메인 로직·메커니즘·spec 거버넌스는 일절 변경 없음.

---

## 1. 정본 템플릿 (planner/Q 관찰값, 2026-06-17)

```
root/
├── package.json          # private, workspaces:["apps/*","packages/*"], scripts=turbo, packageManager:bun@1.3.12, devDeps:{turbo^2.7.4, typescript}
├── turbo.json            # tasks: build/dev/lint/typecheck/test
├── tsconfig.base.json    # 공통 compilerOptions
├── docker-compose.yml    # 루트 유지
├── bun.lock              # 루트(단일 lockfile)
├── apps/
│   └── <product>/        # planner: apps/planner/{app,components,lib,public,...}  (※ planner/Q는 app 내부 src/ 없음)
│   └── backend/          # NestJS skeleton (planner/Q 보유)
├── packages/{types,api-client,auth}/   # placeholder 공유 패키지
└── proc/ daily_outcome/ input/ output/  # 루트 유지
```

planner는 루트와 `apps/planner/` **양쪽에 AGENTS.md/CLAUDE.md**를 둔다(루트=모노레포 룰, 앱=도메인 룰).

---

## 2. games 목표 트리

```
pullim-games/                       (모노레포 루트)
├── package.json                    # name:pullim-games-monorepo, workspaces, turbo scripts
├── turbo.json
├── tsconfig.base.json
├── bun.lock                        # 루트 단일
├── docker-compose.yml              # 루트
├── .github/                        # 루트 (codex-review.yml paths-filter 갱신)
├── AGENTS.md / CLAUDE.md           # 루트 = 거버넌스·모노레포 룰 (현행 유지)
├── proc/ daily_outcome/ input/ output/   # 루트 유지 (games 거버넌스 자산)
└── apps/
    └── games/                      # ← 현재 앱 전체가 여기로
        ├── src/{app,components,games,lib,test}/   # ★ src/ 유지 (결정 D2)
        ├── public/                 # 신규(현재 없음 — arcade 대비 갭)
        ├── scripts/generate-registry.ts
        ├── e2e/ migrations/
        ├── next.config.ts tsconfig.json(→extends ../../tsconfig.base.json)
        ├── package.json            # name:@pullim-games/games
        ├── components.json postcss.config.mjs eslint.config.mjs
        ├── tailwind.config.ts vitest.config.ts playwright.config.ts
        └── AGENTS.md / CLAUDE.md   # (선택) 앱 도메인 룰 — 결정 D7
```

**핵심 안전장치**: app 내부 `src/` 유지 → `@/* → ./src/*` 별칭 무변경, `gen:registry`의 cwd 기준 `src/games/*`·`src/lib/games/registry.generated.ts` 경로 무변경(앱 cwd에서 실행). **21게임 import 대란 회피**.

---

## 3. 결정사항 (승인 필요)

| ID | 결정 | claude 권장 | 비고 |
|---|---|---|---|
| **D1** | web app 디렉토리명 | **`apps/games`** | planner=`apps/planner`, Q=`apps/q` 패턴 → 제품명 |
| **D2** | app 내부 `src/` 유지 vs 제거 | **유지** | 제거 시 별칭·gen:registry·전 import 변경(고위험). arcade도 src/ 유지. planner/Q 제거는 선택적 추가정리 — 본 PR 범위 외 |
| **D3** | `apps/backend` 지금 생성? | **아니오(보류)** | games는 BE 코드 0. BE 신설(D-GM-BE)은 ECS/P0-2와 함께 gated. 빈 skeleton도 보류 |
| **D4** | `packages/{types,api-client,auth}` 지금? | **최소(스킵)** | P2-4 "packages 정렬"은 모노레포 전환 後. 우선 `apps/games`만 + workspaces는 미래 대비 선언만 |
| **D5** | `CONVENTION.md §3.1 / T-UI` 경로 갱신 | **별도 동반 필요** | `src/components/...` → `apps/games/src/components/...`. CLAUDE §8/§9상 **G1/G3/G4 합의 + 별 작업**. 본 restructure와 동시 머지 조율 |
| **D6** | Vercel root directory | **`apps/games`로 변경** | 모노레포 root-dir 설정 필요. 진행 중 "개인→공용 계정 이전"(메모리)과 함께 처리 |
| **D7** | `apps/games`에 AGENTS/CLAUDE 사본 | **루트만 유지(사본 생략)** | games 거버넌스는 단일 출처가 명확. planner식 이중화는 혼란 — 루트 1곳 유지 권장 |

D2·D3·D4가 "thin monorepo"(=apps/games 단독, src/ 유지, backend·packages 보류) 권장안의 핵심. **D5는 내가 단독 결정 불가 — 게이트키퍼 합의 필요**.

---

## 4. 단계 (PR 분할)

**PR-1: 모노레포 토폴로지 전환** (본 plan 핵심)
1. 루트 `package.json`(workspaces/turbo scripts/packageManager)·`turbo.json`·`tsconfig.base.json` 신설
2. `git mv` 로 앱 자산 → `apps/games/` (app/components/games/lib/test·scripts·e2e·migrations·config 파일·components.json 등). proc/daily_outcome/input/output/docker-compose/.github/AGENTS/CLAUDE 는 루트 잔류
3. `apps/games/package.json`: name `@pullim-games/games`, 기존 scripts(`dev -p 3033`·predev/prebuild gen:registry) 이관, `tsconfig.json` → `extends ../../tsconfig.base.json` + paths 유지
4. 루트 scripts: `dev`=`turbo dev`, `dev:games`=`bun --filter @pullim-games/games dev`, build/lint/typecheck/test=turbo
5. `apps/games/public/` 신설(현 누락 갭 해소), `input/`·`output/` git 추적 여부 정리(arcade 정합)
6. `.github/workflows/codex-review.yml` paths-filter·작업 디렉토리 `apps/games/**` 반영
7. 검증: `bun install`(workspace) → `turbo typecheck lint build test` green → `bun run test:e2e` → 4-viewport `ui:audit`

**PR-2(별·동반): CONVENTION/문서 경로 갱신** — D5. `.pullim-meta/CONVENTION.md §3.1·T-UI`, 루트 `CLAUDE.md`·`AGENTS.md`·`README.md` 구조 섹션의 `src/...` → `apps/games/src/...`. **G1/G3/G4 합의 후**. CLAUDE §8(컨벤션 변경 분리) 준수.

**PR-3(후속·gated): backend·packages** — D3/D4. ECS/BE 신설 게이트 통과 시 P0-2/P2-4로 별도 진행. 본 작업 범위 외.

---

## 5. 리스크

| # | 리스크 | 영향 | 완화 |
|---|---|---|---|
| R1 | `git mv` 중 경로 누락 → 빌드 깨짐 | H | 단일 PR, 단계별 `turbo build` 검증. src/ 유지로 내부 import 무변경 |
| R2 | `gen:registry` cwd 오인 → registry 빈 생성 | H | 앱 cwd(`apps/games`)에서 실행되도록 predev/prebuild·turbo 파이프라인 확인. 생성물 diff 검증 |
| R3 | Vercel root-dir 미변경 → 배포 실패 | M | D6, 개인→공용 계정 이전과 함께. 머지 전 preview 배포 확인 |
| R4 | CONVENTION 경로 미갱신 → 컨벤션 표류·audit 트리거 오작동 | M | PR-2 동반 머지(D5). 미합의 시 PR-1 보류 |
| R5 | codex-review.yml paths-filter 누락 → 검증 게이트 미작동 | M | AGENTS §9 사전 sweep. paths를 `apps/games/**`로 갱신 |
| R6 | e2e/playwright·vitest 경로 base 변경 | M | config 이관 후 `test:e2e`·`bun test` 재실행 검증 |

---

## 6. 작업항목 체크리스트 (머지 후 자가 검증 — feedback_plan_workflow)

- [x] 루트 `package.json` workspaces:["apps/*","packages/*"] + turbo scripts + packageManager bun@1.3.12
- [x] `turbo.json`·`tsconfig.base.json` 정본 템플릿과 동형
- [x] 앱 전체 `apps/games/` 이동(388 renames), `src/` 유지, `@/* → ./src/*` 동작 (typecheck alias 에러 0)
- [x] `apps/games/tsconfig.json` extends `../../tsconfig.base.json`, paths 유지
- [x] `gen:registry` 정상(21게임 등록) + registry.generated.ts in-sync(diff 0)
- [x] `turbo typecheck`(WIP gemini 제외 green) · `turbo lint` · `turbo build`(전 라우트) · `turbo test`(471/471) green
- [ ] `bun run test:e2e` — **로컬 미실행**(build+start+브라우저 비용). CI e2e job 으로 검증 예정
- [x] `apps/games/public/` 존재(갭 해소, .gitkeep)
- [x] 4-viewport `ui:audit` critical overflow 0 — `/manage/content` 4 viewport(320·390·768·1280) 전부 실측 PASS, critical/informational overflow 0 (2026-06-30 검증). 캡처: `/tmp/ui-audit/{mobile-sm-320,iphone13-390,tablet-768,desktop-1280}.png`
- [x] ci.yml·e2e-nightly.yml `apps/games` working-directory + paths-filter·awk·artifact 경로 갱신. codex-review.yml 무수정(루트 diff·문서 참조 — 거버넌스 §9)
- [x] (D5) `.pullim-meta/CONVENTION.md` T-UI 경로 + README/CLAUDE/AGENTS 구조 섹션 갱신 (사용자 G1 게이트 무시 승인)
- [x] (D3/D4 확인) backend·packages 미생성 — thin monorepo. BE 는 별 repo `pullim-api`

## 7. 잔여 (별도 처리)

- **D6 Vercel root directory → `apps/games`**: 대시보드 설정. "개인→공용 계정 이전"과 함께. 머지 전 preview 배포 확인 필요.
- **commit/PR**: 사용자 지시 시. 미추적 WIP(`apps/games/src/lib/server/ai/{gemini,index}.ts` — gemini-adapter 작업물)는 본 restructure 와 분리 권장.
- **branch**: `chore/monorepo-restructure` (현재 작업 브랜치).
```
