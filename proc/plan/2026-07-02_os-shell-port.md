# pullim-web OS 셸 정식 이식 → pullim-games

- 상태: COMPLETE (구현·검증 완료, PR 대기)
- 브랜치: `feat/os-shell-port` ← `dev`
- 선행: `2026-07-01_pullim-web-layout-alignment.md`(팔레트-only, PR #131·#135) — 본 작업이 **셸 골격 이식으로 승격**
- 관련 메모리: `project_pullim_web_integration`, `project_logged_in_route_audit_seed`

## 0. 거버넌스 — CLAUDE.md §7 "sibling 참조 금지"와의 관계 (codex #138 R3-1)

본 이식은 CLAUDE.md §7 "다른 풀림 프로젝트(planner/Q/classbot) 코드·페이지·mock 참조 — 독립 프로젝트이므로 cross-domain 의존 금지" 룰과 **충돌하지 않는다**:
- **G1(사용자) 명시 지시**: "pullim-web 레포를 보고 레이아웃 코드를 베껴오라 … 레이아웃만 그대로, 내용물은 games"(2026-07-02). 프로젝트 오너(G1)의 직접 지시.
- **런타임 cross-repo 의존 아님**: pullim-web 을 import/참조하지 않는다. os-tokens.css·os 컴포넌트를 games 트리로 **일회성 vendored copy** — 이후 games 가 **독립 소유**(pullim-web 변경이 games 에 전파 안 됨). §7 룰의 취지(런타임 sibling 의존 금지)에 저촉 안 됨.
- **대상은 planner/Q/classbot 이 아니라 OS 호스트(pullim-web)**: 룰이 명시한 3 sibling 이 아니라, games 가 핸드오프로 통합되는 OS 셸([[project_pullim_web_integration]] 연장). games 를 OS 셸 안에 시각 정합시키는 통합 작업.
- CLAUDE.md 본문은 **수정하지 않는다**(§9 codex 회피성 룰북 수정 금지). 본 §0 이 G1 합의 기록.

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
- **4-viewport overflow audit — 전 changed surface critical=0 (HARD gate 충족)** (codex #138 R3, 사용자 결정 "이 PR 에서 허브까지 수정"):
  - `/home`·`/games`·`/manage` (seeded) · `/games/<id>` (몰입) · `/` (landing) = **4뷰포트 전부 critical 0** ✓
  - 공식 `bun run ui:audit /games` = **critical 0 PASS** (informational 79 = 자연 스크롤 catalog)
  - **가로 overflow(실제 레이아웃 break) 근본 수정**:
    - `.shell` grid `1fr` → `minmax(0, 1fr)` — 순수 `1fr`(암묵 min-width:auto)이 넓은 자식에 맞춰 트랙을 뷰포트 밖으로 확장(grid blowout)해 320px 문서 가로 스크롤을 유발하던 근본 원인 제거.
    - 모바일 topbar 압축(검색·알림 placeholder·mast sub 숨김) + GameHubPage 헤더 `flex-wrap`(제목+뷰토글 320px wrap).
  - **fold 아래 스크롤 콘텐츠**(catalog 카드·manage 보조 링크)는 `data-cta-priority="informational"` 마킹 — games 기존 관례(AuthForm·ModeChipsRow·RecommendationCard 선례). 5개 허브 뷰(Grid/Preview/List/Table/Thumbnail)·CustomGamesSection·manage 보조 CTA. **가로 break 는 0(마킹으로 숨긴 것 아님, 실제 fix)**, 세로는 스크롤 catalog 의 정당한 informational.

## 5. 후속

- **cross-앱 세션 연속성(SSO, codex #138 R4-1)**: ServiceSwitcher 는 sibling 앱 하드 nav 를 노출하나 games 회원 세션은 host-only 쿠키라 동반 안 됨. Domain=.pullim.ai 세션(공유 auth pullim-api / Q 의 `NEXT_PUBLIC_DOMAIN_API_URL` 모델) 채택은 별 트랙 — 게스트 무영향, 회원 graceful 재인증. [[project_pullim_web_integration]] SSO 스텝.
- R4-2 마케팅 크롬 억제 블록(pullim-web 전용 `body:has(.os-root)>header/footer/cookie/main#main`) 미이식(games 무관·향후 동의 배너 훼손 위험 제거). R4-3 `--sans` spec/08 §8.2 정합(system-ui·-apple-system 제거).
- main 승격은 사용자 게이트(dev→dev-games.pullim.ai 자동배포로 pullim-web↔games 연속성 실검증 후).
