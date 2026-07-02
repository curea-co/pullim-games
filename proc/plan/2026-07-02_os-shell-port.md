# pullim-web OS 셸 정식 이식 → pullim-games

- 상태: COMPLETE (구현·검증 완료, PR 대기)
- 브랜치: `feat/os-shell-port` ← `dev`
- 선행: `2026-07-01_pullim-web-layout-alignment.md`(팔레트-only, PR #131·#135) — 본 작업이 **셸 골격 이식으로 승격**
- 관련 메모리: `project_pullim_web_integration`, `project_logged_in_route_audit_seed`

## 1. 배경·문제

games 를 pullim-web(풀림 OS 웹 셸)에서 핸드오프(리디렉션)하는 것은 되지만, games 에 진입하면 **pullim-web 의 글로벌 네비게이션·사이드바 크롬이 이식돼 있지 않았다.** #131·#135 는 팔레트·색 remap 만 했지 셸 **골격**을 안 가져옴.

원인: games 기존 셸(`components/shell/AppShell` — Tailwind 72px 헤더 + lucide 사이드바)은 pullim-study-demo 포크로, pullim-web OS 셸(`.os-root` + `os-tokens.css` + topbar/rail/tabbar + ServiceSwitcher)과 **다른 아키텍처**. (pullim-Q 도 OS 셸 미이식 — games 와 동형. 형제 앱 참고로는 해결 불가, pullim-web 이 원본.)

## 2. 결정 (사용자 확정)

pullim-web OS 셸 크롬을 **verbatim 이식**(스타일 그대로), **내용물만 games 로**:
- **rail** = games 섹션만 (홈/게임 허브/관리/소개), OS `.nav-item` 스타일
- **ServiceSwitcher** = 유지 (current=게임즈, 플래너/문제큐 등 앱-홉)
- **mast 워드마크** = 풀림 게임즈

## 3. 변경 매니페스트

**CSS**
- `app/globals.css`: `:root` 에 `--pullim-*` 베이스 토큰(pullim-web globals 정합, light 단일) + `@import "./os-tokens.css"`
- `app/os-tokens.css` (신규): pullim-web `src/styles/os-tokens.css` L1–704 verbatim (`.os-root` 셸 블록). `--mono` 만 games next/font(`--font-jetbrains-mono`) 정합 1줄 적응. OS 홈페이지 전용(L707–917) 제외.
- `postcss.config.mjs`: `tailwindcss/nesting` 추가(네이티브 `& .foo` flatten)

**컴포넌트** `components/os/` (신규)
- `OsShell.tsx` — topbar(레일토글+mast+ServiceSwitcher+OsTopbar) + shell(rail+main+`.crumbs`) + tabbar
- `OsServiceRail.tsx` — 기존 `shell/nav-config` `studentDomains`·`findActiveNav` 재사용, lane/entitlement 제거
- `OsTopbar.tsx` — 검색·알림 placeholder + 아바타 메뉴를 games auth(`lib/auth/client`·`lib/core/player`)로 배선
- `RailCollapseToggle.tsx` — verbatim(키 `pullim-games:rail-collapsed`)
- `ServiceSwitcher.tsx` — serviceGate/entitlement 제거, `OS_SERVICES_NAV`
- `OsTabbar.tsx` — verbatim
- `OsAppShell.tsx` — variant 라우터(default 풀셸 / game 몰입 / landing 온보딩), 기존 `detectVariant` 로직 계승

**lib·에셋**
- `lib/os/urls.ts` (신규) — osUrl/plannerUrl/gamesUrl/arcadeUrl/jrUrl (pullim-web auth/config 이식)
- `lib/os-services.ts` (신규) — 카탈로그 이식, href 를 games 도메인용 절대 URL 로 어댑트(OS-내부 서비스=osUrl())
- `public/os/icons/*.svg` 11개 복사

**배선·정리**
- `app/layout.tsx`: `<AppShell>` → `<OsAppShell>`
- 구 셸 제거: `shell/{app-shell,app-header,app-sidebar,mobile-drawer,breadcrumb}.tsx`. `nav-config.ts` 존치(os/ 재사용)

## 4. 검증

- `typecheck` ✓ · `lint` ✓ · `build` ✓ (os-tokens 네스팅 flatten 확인: `.os-root .topbar{…}`) · `vitest` 497/497 ✓
- 시각(seeded guest, 4 viewport): `/home`·`/games` 데스크톱=풀 OS 셸(mast 풀림 게임즈 + ServiceSwitcher 게임즈 + rail 4섹션 + breadcrumb), 모바일=rail 숨김+하단 tabbar, `/games/<id>`=몰입(백링크+mast, rail 없음), `/`=온보딩
- **4-viewport overflow audit** (critical=0 gate):
  - `/home` (OS 셸) = **0** ✓ / `/games/<id>` (몰입) = **0** ✓ / `/` (랜딩) = **0** ✓
  - `/games` (허브) = 72 — **baseline(구 셸, origin/dev) = 70**. 델타 **+2**, 전부 fold 아래 게임 카드 링크(세로, `right`≤1220<1280 가로 overflow 없음). **셸 이식 회귀 아님 — 밀집 그리드에 대한 기존 audit 한계** (셸 자체 `/home`=0 이 증거). [[project_e2e_infra_broken]] 와 동일한 비-델타 성격.

## 5. 후속

- `/games` 허브의 below-fold 카드 audit 이슈는 별도(본 PR 무관, 기존 70건). 필요 시 `data-cta-priority` 마킹 또는 audit 룰 정교화로 별 작업.
- main 승격은 사용자 게이트(dev→dev-games.pullim.ai 자동배포로 pullim-web↔games 연속성 실검증 후).
