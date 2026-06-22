# apps/games 내부 `src/` 래퍼 제거 — Q/planner 정합 + dev/main 브랜치 구성

**작성일**: 2026-06-22
**작성자**: 사용자(G1) 지시 + claude
**상태**: 실행 중 (PR → codex → 머지 → main 승격 → dev 생성)
**근거**: 사용자 지시 — "브랜치 구조 dev/main 구성 + Q/planner 구조 참고". planner/Q 의 `apps/<name>/{app,components,lib}` (src/ 래퍼 없음) 토폴로지에 정합.

## 1. 배경

`proc/plan/2026-06-17_monorepo-restructure.md`(PR #120)에서 thin monorepo 로 전환하며 import 대란 회피를 위해 `apps/games/src/` 를 **유지**했었다(D2). 그러나 정본 형제 planner/Q 는 `apps/<name>/` 바로 아래 `app`·`components`·`lib` 를 두고 **`src/` 래퍼가 없다**. 사용자가 그 구조 정합을 지시 → `src/` 래퍼 제거.

## 2. 변경 (구조)

```
apps/games/src/{app,components,games,lib,test}/  →  apps/games/{app,components,games,lib,test}/
```

- `@/*` 별칭: `./src/*` → `./*` (import 문 자체는 무변경 — 별칭 매핑만 변경)
- `gen:registry`: glob `src/games/*` → `games/*`, output `src/lib/games/...` → `lib/games/...`, id 추출 `segments[2]` → `segments[1]`
- config 갱신: tsconfig(paths)·vitest(include/alias/coverage/shim)·tailwind(content)·eslint(ignores/files)·components.json(css)
- e2e: `mode-entry-points.spec.ts` 의 상대 import `../src/lib/games/registry` → `../lib/games/registry`
- CI: ci.yml paths-filter·awk(`$3=="games"`,`$4` 추출)·vitest 샤딩 경로·registry diff 경로 갱신. e2e-nightly 주석. codex-review.yml 무수정
- 문서: CLAUDE/AGENTS/README 경로·트리·노트, CONVENTION T-UI 경로 (`apps/games/src/` → `apps/games/`)

## 3. 브랜치 구성 (사용자 결정)

- **main = 모노레포 + curriculum** — `feat/curriculum-phase1`(모노레포 + curriculum Phase1 + 본 src-drop) 을 main 으로 승격.
- **dev = main 에서 분기** (Q/planner 의 main+dev 2-브랜치 모델 정합). 기존 죽은 dev(167 behind) 는 재생성.

## 4. 검증 (로컬, green)

- gen:registry 21게임 정상(id 추출 fix 후) · registry in-sync
- typecheck · lint · build(전 라우트) · 단위테스트 전부 green
- (e2e/ui:audit 는 CI 에서)

## 5. 작업항목

- [x] `src/` 내용 한 단계 위로 이동 (git mv)
- [x] config 6종 + gen:registry id 추출 + e2e 상대 import 갱신
- [x] typecheck·lint·build·test green
- [x] ci.yml·e2e-nightly 경로 갱신, codex-review.yml 무수정
- [x] CLAUDE/AGENTS/README 경로·트리 갱신
- [ ] CONVENTION.md T-UI 경로 갱신 (.pullim-meta)
- [ ] PR → codex APPROVE → feat/curriculum-phase1 머지
- [ ] feat/curriculum-phase1 → main 승격, dev 생성
