# E2E 인프라 fix — Nightly mass-red 진단·복구 plan

> 작성: Claude Opus 4.8 (에이전트) · 2026-06-30
> 근거: `daily_outcome/2026-06-30.md` C 항목 (G4 이관 → 사용자 G1 권한 위임으로 직접 owning)
> 연결: [[project_e2e_infra_broken]] · `proc/plan/2026-06-17_monorepo-restructure.md`(L131 e2e 미검증) · `2026-06-23_domain-branch-topology.md`(#127 포트 cutover)
> 메모리: e2e 인프라는 **하드 게이트 아님** — main mass-red 는 선행 red, PR delta 만 평가 (`project_e2e_infra_broken`).

## 0. 현황 (2026-06-30 확인)

`E2E Nightly` 워크플로 **5일+ 연속 100% failure** (gh run 조회):

| run | 날짜 | 결과 |
|---|---|---|
| 28395500154 | 2026-06-29 | failure (전 22 job: 21 게임 matrix + shared specs **모두** red) |
| 28331001414 | 2026-06-28 | failure |
| 28297116287 | 2026-06-27 | failure |
| 28257107129 | 2026-06-26 | failure |
| 28193739924 | 2026-06-25 | failure |

**전 job 동시 red = 개별 spec 결함 아님, 공유 인프라/진입 결함.** 실패 패턴은 전부
`locator.waitFor: Test timeout of 30000ms exceeded` (예: `activity-heatmap` → `getByPlaceholder("입력해주세요")` visible 대기 타임아웃). `page.goto` 자체는 통과 → 페이지는 응답하나 **기대 콘텐츠가 렌더되지 않음**.

## 1. Root cause 가설 (2)

### H1 — 포트 불일치 (3033 vs 3004) · **이미 해소 가능성 높음**

06-29 nightly 로그: `[WebServer] $ next start -p 3033` 인데 `playwright.config.ts` 는 `baseURL = http://localhost:3004` 대기. webServer 가 3033 에 뜨면 3004 대기 readiness 가 어긋남.

- **현재 상태**: `apps/games/package.json` `start: "next start -p 3004"`, `playwright.config.ts PORT=3004` — **일치**. 포트 SoT 정렬은 #127 (`7bdbf64`, 2026-06-29) 이 수행.
- 즉 06-29 nightly 는 #127 머지 직전 커밋(start=3033)에서 돌아 불일치로 red 였을 수 있음.
- **검증(무비용)**: #127 머지 후 **다음 nightly(2026-06-30 02:00 KST 이후) 결과 1건** 확인. green 이면 H1 단독 원인 확정, 본 plan 종결.

### H2 — auth/학년수집 게이트 리다이렉트 · **포트 fix 후에도 잔존 가능**

`page.goto` 통과 + `locator.waitFor` 타임아웃 = 페이지는 떴으나 게임/대시보드 콘텐츠 부재. auth 입구 모델(#114 게스트/회원 게이트)·중등 재포지셔닝(#125 학년 수집·신원 마이그레이션) 도입 후 `/home`·`/games/*` 가 **로그인/학년수집 게이트로 리다이렉트**되면, e2e spec 은 인증/온보딩 상태를 시드하지 않아 게임 화면에 도달 못 함.

- e2e helper 현황: `e2e/helpers/{games,seed,viewports}.ts` — `seed.ts` 는 custom-* localStorage 콘텐츠 주입만, **게스트/회원·학년 상태 시드 없음**.
- **검증**: 로컬 `bun run build && bun run start` → `/home` 수동 진입 시 게이트 리다이렉트 여부 1회 확인. 리다이렉트면 H2 확정.

## 2. fix 방향

1. **H1 검증 우선 (무비용)** — 다음 nightly green 여부 확인. green → §3 체크 완료, plan archive.
2. **H1 잔존 red 시 H2 처리** — `e2e/helpers/` 에 인증/온보딩 우회 시드 헬퍼 추가 (`seedGuestSession()` / `seedGradeOnboarded()` — localStorage·쿠키로 게이트 통과 상태 주입). 전 spec `beforeEach` 또는 playwright `storageState` 로 일괄 적용.
3. **CI e2e job(`ci.yml`)·nightly 공통** — webServer build 단계 로그를 artifact 로 항상 보관(현 `stdout: ignore` → 진단 시 `pipe` 전환 검토).

## 3. 작업 항목 (자가 검증 체크리스트)

- [ ] H1: #127 머지 후 **첫 nightly run 결과** 확인 — green/red 기록 (run id)
- [ ] H1 green 시: 본 plan COMPLETE archive, [[project_e2e_infra_broken]] 메모리 "포트 cutover 로 해소" 갱신
- [ ] H1 잔존 red 시: 로컬 `/home` 게이트 리다이렉트 수동 확인 → H2 확정/기각
- [ ] H2 확정 시: `e2e/helpers/` 인증·온보딩 시드 헬퍼 추가 + 대표 spec 1개(activity-heatmap) 로컬 green 재현
- [ ] H2 fix 후: nightly 또는 수동 `workflow_dispatch` 1회 green 확인

## 4. 거버넌스 메모

- e2e mass-red 는 **머지 하드 게이트 아님** (`project_e2e_infra_broken`). PR delta 평가만 유효 — 본 plan 은 main 위생 복구이지 신규 PR 차단 근거 아님.
- 소유권: 당초 daily_outcome C 는 G4 이관 대상이었으나, 사용자(G1) 가 게이트 협의 대신 직접 진행 권한 위임(2026-06-30) → 본 plan 을 에이전트가 owning, 검증-우선(H1 무비용 확인) 경로로 진행.
