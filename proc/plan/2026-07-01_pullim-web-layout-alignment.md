# 디자인 시스템 정합 — 풀림 통합 룩 (풀 정합)

> 작성: Claude Opus 4.8 (에이전트) · 2026-07-01
> 근거: G1 지시 2026-07-01 — 풀림 제품군 통합 룩(ink/paper/blue/lemon 팔레트 + 2-role 폰트)으로 정합. 스코프 "풀 디자인 정합" 확인.
> **SoT: 본 리포 `proc/spec/08-디자인-시스템.md`.** 정합 대상 룩의 값은 spec/08 §8.1·§8.2 에 encode 되어 있으며, 이후 모든 작업의 권위는 spec/08(+§8.3·§8.4)이다. 외부 리포 코드/파일 참조·import 없음 — **독립 프로젝트 원칙(CLAUDE.md §7) 준수**. (디자인 방향의 origin 은 G1 의 풀림 통합 룩 지시이며, 본 리포 spec 이 이를 자립적으로 정의한다.)
> 동반 spec 개정(G1 승인 2026-07-01): `spec/08 §8.1`(팔레트)·`§8.2`(2-role 폰트) + `spec/09` 폰트 라인 정합.

## 0. 목표

풀림 제품군 **통합 룩**으로 디자인 시스템 전면 정합. 공통 셸 + `tailwind.config` 변경이라 **21개 게임 전체 영향** → 4-viewport audit 필수(merge gate), 단계별 검증. 권위는 본 리포 spec/08.

## 1. Gap 요약 (통합 룩 목표 ← games 현재)

| 항목 | 통합 룩 (목표, spec/08) | games (현재) |
|---|---|---|
| 팔레트 | ink `#0D1A1F`·paper `#F0F6FB`·blue `#0362DA`·**lemon `#E6FF4C`** + ink2~5·line/line2·paper2/3 | slate 50~900·blue·bg-primary `#FBFAF8`·type-primary `#0F172A` |
| 폰트 | Pretendard(본문·헤딩) + **JetBrains Mono**(mono). brand latin 폰트 미도입(한글 UI 렌더 표면 부재) | Pretendard 단독 |
| 헤더 | 72px sticky, backdrop blur, hairline | 56px(h-14) |
| 컨테이너 | 1280px, gutter `clamp(20,4vw,48)` (`.container-x`) | 1280px, px-4/6/8 |
| radii | 4/6/8/16 (spec §8.4 준수 — 18px 미도입) | 4/6/8/16 |
| spacing | `--s-1~10` (4~128) | Tailwind 기본 |
| type scale | `--fs-xxs~display` (11~68) + `--lh`·`--ls` | display/body/label/helper |
| section | `--section-pad clamp(72,10vw,160)` | py-6/8 |

## 2. 전략 — 시맨틱 토큰 remap + 신규 토큰 추가 (컴포넌트 대량 재작성 회피)

games 컴포넌트·21게임이 쓰는 기존 토큰 **이름 유지**하고 **값을 web 팔레트로 remap** → 자동으로 새 룩 반영. 동시에 web 신규 토큰 추가.

- `bg-primary #FBFAF8 → paper #F0F6FB` / `border-hairline #E5E5E5 → line #D6E2EE` / `type-primary #0F172A → ink #0D1A1F` / `type-secondary → ink3 #45555C` / `accent-positive` 불변(#0362DA)
- `pullim-slate-*` 스케일 → web ink/paper 계열로 색온도 이동(cool→ink-tinted). 근사 매핑, audit 로 회귀 검출.
- **신규(실제 반영)**: `pullim-lemon`, `pullim-ink-{2,3,4,5}`, `pullim-paper-{2,3}`, `pullim-line-{,2}`, font `mono`(JetBrains Mono). radii 18px·`highlight` alias·CSS-var 스케일(spacing/type)·container-x 는 spec §8.2~§8.4 정합상 미도입(후속 Phase 에서 spec 동반 시).

Tailwind v4 마이그레이션은 **비스코프**(games=Next15+Tailwind v3 유지) — 통합 룩 토큰 값을 v3 `tailwind.config`(hex) 로 이식. games 토큰 SoT 는 config 이며, globals CSS-var 병행 시스템은 미도입(codex R1 — 미소비·spec 드리프트 회피).

## 3. 단계 (Phase)

### Phase 1 — 디자인 파운데이션 (토큰·폰트·spec) ← 본 PR 시작
- [x] `layout.tsx`: JetBrains Mono `next/font/google` 추가 → CSS var(`--font-jetbrains-mono`). Pretendard CDN 유지. (brand latin 미도입)
- [x] `globals.css`: 원상 유지 — games 토큰 SoT 는 `tailwind.config`(hex). CSS-var 병행 시스템·dark·container-x 는 미소비·spec 드리프트로 미도입(codex R1).
- [x] `tailwind.config.ts`: 시맨틱 remap + slate 스케일 remap(ink/paper-tinted) + 신규 토큰(mono 폰트, lemon, ink/paper/line 스케일).
- [x] `spec/08 §8.1·§8.2` + `spec/09` 개정(G1 승인) — 팔레트(lemon·ink/paper) + 타이포 2-role(Pretendard 본문·헤딩 + JetBrains Mono mono). brand latin 미도입 명시.
- [ ] `typecheck·lint·build` green.

### Phase 2 — 셸 크롬 정합
- [ ] `app-header.tsx`: 높이 72px(`--nav-h`), backdrop blur, hairline. 로고/nav web 대응.
- [ ] 컨테이너: `.container-x`(clamp gutter)로 페이지 래퍼 정합. section spacing.
- [ ] footer(있으면) web 4-col 대응.
- [ ] nav 패턴: 브레이크포인트(햄버거 <1024px)·드로어 web 대응 검토(현 <768px). — games 사이드바 구조는 games UX 특성이라 **선택적 정합**(과도 변경 회피, audit).

### Phase 3 — 회귀 정리 (PR #135, 2026-07-02)
- [x] `bun run ui:audit` 5-서피스 × 4-viewport — critical **horizontal** overflow **0**. guest: `/`(랜딩)·`/manage/content`(사이드바)·`/games`(게임 허브 — TypingMock preview 렌더 서피스, codex R1). 로그인(게스트 시드): `/home`(대시보드)·`/games/factorization`(게임). 로그인 라우트는 `pullim_games_guest` 쿠키 + `pullim-games:player` localStorage 시드로 middleware+RequireIdentity 통과시켜 실제 대시보드·게임 렌더 감사(랜딩 bounce 아님 확인).
  - `/games` 는 17개 게임 카드가 세로 스크롤되는 긴 그리드라 stock gate 스크립트가 fold 아래 카드를 `bottom>vh` 로 flag(70건) — 전부 **세로 스크롤 아티팩트**(`right>vw` 수평 overflow 0). 본 PR diff 는 `/games` 레이아웃/높이 무변경(TypingMock 색값만), origin/dev 와 동일 패턴 = 선행 존재·비회귀. gate 스크립트는 회피 목적 수정 금지(governance)라 미변경, 실제 방어선인 수평 overflow 는 0.
- [x] 팔레트 remap 시각 회귀 수정 — **#131 remap 이 놓친 하드코딩 hex 5개소 정정** 후, **비-Tailwind 표면 전용 공유 토큰 모듈(`lib/design-tokens.ts`) 도입**(codex R2). Framer Motion `animate` 와 `next/og`·manifest 는 Tailwind 유틸 클래스를 못 써 리터럴 값이 불가피한데, 이를 파일마다 흩뿌리지 않고 **단일 상수 모듈 경유**로 SoT 를 지킨다(spec/08 §8.1 → tailwind.config → 본 모듈 3계층 동기, globals CSS-var 병행은 Phase 1 R1 로 미도입). 정정·이관 대상: `factorization/DropZone`·`FactorChipRack` 블록 보더 `#E5E5E5→palette.line(#D6E2EE)`, `game-hub/TypingMock` 커서 `#0F172A→palette.ink(#0D1A1F)`, `opengraph-image`(=twitter-image 재export) 카드 전면 `paper/ink/line/ink3` + manifest splash bg `paper`. lemon 은 브랜드 로고 픽셀(PullimMark·app-header SVG) 한정 5개소만 — highlight 룰 준수(RPG 재화·뱃지 남용 없음).
- [x] OG 카드 폰트 스택 spec/08 §8.2 정합(codex R3) — `system-ui` 1차 → **Pretendard 1차**로 재정렬(system-ui 는 말단). next/og edge 는 CDN 변수 폰트·정적 woff 미서빙이라 실제 렌더 fallback 은 플랫폼 한글 폰트(Apple SD Gothic Neo·Malgun Gothic)가 담당하되, spec 룰(system-ui 비-1차)은 준수.
- [x] `bun test` green (497/497). typecheck·lint·build 전부 green.

## 4. 리스크·가드

- **하이퍼캐주얼 룰 유지**(메모리 `feedback_scale_hypercasual`): lemon accent 는 highlight 강조만, 게임화 재화·뱃지 금지.
- **silent fallback 금지**(AGENTS.md): 미정의 토큰 클래스 누락 방지 — remap 시 기존 토큰 값만 교체, 이름 삭제는 audit 후.
- **디자인 토큰 SoT**: `tailwind.config` ↔ `spec/08 §8.1` 동시 갱신(한쪽만 = 표류).
- **4-viewport audit HARD gate**: 공통 셸·config 변경이라 머지 전 필수(AGENTS.md viewport 룰).

## 5. 검증 (자가 체크리스트)
- [x] Phase 1: typecheck·lint·build green, 폰트 2종(Pretendard·JetBrains Mono) 로드 확인, test 497/497
- [x] Phase 2: 헤더 72px 적용 확인 (container-x 는 Phase 3 로 이관)
- [x] **4-viewport ui:audit (merge gate, AGENTS.md)** — 2026-07-01 실측, **3 서피스 전부 critical overflow 0 PASS**:
  - `/` (탑네비): 320·390·768·1280 overflow 0
  - `/manage/content` (사이드바): 4 viewport overflow 0
  - `/games/factorization` (게임, guest 시드): 4 viewport overflow 0 — 헤더가 게임 페이지에도 렌더되므로 포함
  - slate remap 후 재감사에서도 3 서피스 overflow 0 유지
- [x] **Phase 3 (PR #135, 2026-07-02)** — ui:audit 5 서피스 × 4-viewport, 수평 overflow 전부 **0** (아래 표), 게임 라우트 **로그인(게스트 시드) 감사** + `/games`(TypingMock 렌더 서피스, codex R1) 포함, 팔레트 remap 하드코딩 hex 회귀 정정 + 공유 토큰 모듈 이관, gate 전부 green:

  | 라우트 | 신원 | 320×568 | 390×844 | 768×1024 | 1280×800 |
  |---|---|---|---|---|---|
  | `/` (랜딩·탑네비) | guest | 0 | 0 | 0 | 0 |
  | `/manage/content` (사이드바) | guest | 0 | 0 | 0 | 0 |
  | `/games` (게임 허브·TypingMock preview) | guest | 0¹ | 0¹ | 0¹ | 0¹ |
  | `/home` (대시보드) | **로그인(게스트)** | 0 | 0 | 0 | 0 |
  | `/games/factorization` (게임) | **로그인(게스트)** | 0 | 0 | 0 | 0 |

  표 값 = **수평(`right>vw+1`) critical overflow**(실제 레이아웃 방어선). ¹`/games` 는 17-카드 세로 그리드라 stock gate 가 fold 아래 카드를 `bottom>vh` 로 flag(세로 스크롤 아티팩트, 수평 0·비회귀·선행존재). 그 외 4 서피스는 수평·수직 모두 0, informational 도 0. 팔레트 hex 정정·토큰 모듈 이관 후 재감사에서도 동일.

- container-x·section: **spec-gated 로 제외** — Phase 1 codex R1 이 미소비 container-x/section CSS-var 을 spec 드리프트로 제거했고, 재도입은 spec/08 동반 개정 + G1/G3/G4 합의 필요(CLAUDE.md §4). 본 PR 은 일방 도입 안 함(§2 전략 유지). footer: pullim-games 는 footer 컴포넌트 부재 — **N/A**.
- [x] spec/08 §8.1 ↔ tailwind.config 토큰 정합 — **ZERO DRIFT**: Core4(blue·ink·paper·lemon) + Extended(bg-block·line·line2·ink2/3/4/5·paper3·accent-negative) 13개 시맨틱 앵커 전부 config 값 일치. config 의 추가 스케일 rung(blue ramp·slate 중간값·pullim-danger)은 spec 정의 앵커가 아닌 파생 rung 이라 표류 아님.
