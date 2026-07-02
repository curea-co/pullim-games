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

### H1 — 포트 불일치 (3033 vs 3004) · **단독 원인 기각 (2026-07-01 nightly 여전히 red)**

06-29 nightly 로그: `[WebServer] $ next start -p 3033` 인데 `playwright.config.ts` 는 `baseURL = http://localhost:3004` 대기. webServer 가 3033 에 뜨면 3004 대기 readiness 가 어긋남.

- **현재 상태**: `apps/games/package.json` `start: "next start -p 3004"`, `playwright.config.ts PORT=3004` — **일치**. 포트 SoT 정렬은 #127 (`7bdbf64`, 2026-06-29) 이 수행.
- **검증 결과**: #127 머지 후 nightly 2026-07-01 18:53 UTC — 여전히 100% failure. **H1 단독 원인 기각.** H2 처리로 진행.

### H2 — auth/학년수집 게이트 리다이렉트 · **확정 (2026-07-02 정적 분석)**

`page.goto` 통과 + `locator.waitFor` 타임아웃 = 페이지는 떴으나 게임/대시보드 콘텐츠 부재. auth 입구 모델(#114 게스트/회원 게이트)·중등 재포지셔닝(#125 학년 수집·신원 마이그레이션) 도입 후 `/home`·`/games/*` 가 **로그인/학년수집 게이트로 리다이렉트**되면, e2e spec 은 인증/온보딩 상태를 시드하지 않아 게임 화면에 도달 못 함.

**정적 분석으로 H2 확정 (2026-07-02):**

게이트 구조 (2계층):

1. **middleware.ts (Edge/서버)**: `pullim_games_session`(HttpOnly) 또는 `pullim_games_guest`(non-HttpOnly) 쿠키가 없으면 `"/"` 로 redirect. 쿠키 값 미검증 — 존재 여부만 coarse gate. **e2e spec 은 쿠키 미시드 → 미들웨어가 `"/"` 로 redirect → 게임 콘텐츠 미렌더.**

2. **RequireIdentity (클라이언트)**: `getPlayer()` → localStorage `"pullim-games:player"` 파싱. `Player.grade` 가 `GRADES("중1"~"고3")` 안에 없으면 `clearPlayer()` + null → `router.replace("/")`. **e2e spec 은 player profile 미시드 → RequireIdentity 가 `"/"` 로 redirect.**

두 게이트 모두 우회하지 않으면 게임/대시보드 콘텐츠에 도달 불가.

**통과 조건:**
- 쿠키: `pullim_games_guest=1` (non-HttpOnly, Playwright `context.addCookies` 로 주입 가능)
- localStorage: `pullim-games:player = { nickname, grade: "중1"~"고3", consent: true, createdAt }` (Playwright `addInitScript` 또는 `storageState` 로 주입)

e2e helper 현황: `e2e/helpers/{games,seed,viewports}.ts` — `seed.ts` 는 custom-* localStorage 콘텐츠 주입만, **게스트/회원·학년 상태 시드 없음** → H2 확정.

## 2. fix 방향

1. **H1 검증 우선 (무비용)** — ~~다음 nightly green 여부 확인. green → §3 체크 완료, plan archive.~~
   **→ 2026-07-01 nightly 여전히 red. H1 단독 원인 기각. H2 처리로 이행.**
2. **H2 처리 (2026-07-02 완료)** — Playwright `storageState` 글로벌 셋업으로 모든 spec 에 게스트 신원 주입:
   - `e2e/helpers/auth.ts`: `seedGuestSession(page, context)` — 쿠키 + localStorage 개별 주입 helper (localhost.clear() 이후 재주입용).
   - `e2e/setup/auth.setup.ts`: `setup` 프로젝트 — `.playwright/guest-auth.json` storageState 생성.
   - `playwright.config.ts`: `setup` → `chromium` 의존 관계로 모든 spec 이 storageState 상속.
   - `localStorage.clear()` 호출 spec 5개 (activity-heatmap, home-dashboard-layout, english-vocab-typing-case, vocab-typing-case, streak) 에 `seedGuestSession` 재주입 추가.
3. **CI e2e job(`ci.yml`)·nightly 공통** — webServer build 단계 로그를 artifact 로 항상 보관(현 `stdout: ignore` → 진단 시 `pipe` 전환 검토).

## 3. 작업 항목 (자가 검증 체크리스트)

- [x] H1: #127 머지 후 **첫 nightly run 결과** 확인 — nightly 2026-07-01 18:53 UTC 여전히 red → **H1 단독 원인 기각**
- [ ] H1 green 시: 본 plan COMPLETE archive, [[project_e2e_infra_broken]] 메모리 "포트 cutover 로 해소" 갱신 (해당 없음 — H1 기각)
- [x] H1 잔존 red 시: 로컬 `/home` 게이트 리다이렉트 정적 분석 → **H2 확정** (middleware.ts + RequireIdentity.tsx 정적 분석으로 확인)
- [x] H2 확정 시: `e2e/helpers/auth.ts` + `e2e/setup/auth.setup.ts` 시드 헬퍼 추가 + `playwright.config.ts` storageState 글로벌 셋업 + `localStorage.clear()` 사용 spec 5개 `seedGuestSession` 재주입 (PR fix/e2e-onboarding-seed)
- [ ] H2 fix 후: nightly 또는 수동 `workflow_dispatch` 1회 green 확인

## 4. 거버넌스 메모

- e2e mass-red 는 **머지 하드 게이트 아님** (`project_e2e_infra_broken`). PR delta 평가만 유효 — 본 plan 은 main 위생 복구이지 신규 PR 차단 근거 아님.
- 소유권: 당초 daily_outcome C 는 G4 이관 대상이었으나, 사용자(G1) 가 게이트 협의 대신 직접 진행 권한 위임(2026-06-30) → 본 plan 을 에이전트가 owning, 검증-우선(H1 무비용 확인) 경로로 진행.
