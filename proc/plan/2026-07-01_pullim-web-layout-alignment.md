# 디자인 시스템 정합 — 풀림 통합 룩 (풀 정합)

> 작성: Claude Opus 4.8 (에이전트) · 2026-07-01
> 근거: G1 지시 2026-07-01 — 풀림 제품군 통합 룩(ink/paper/blue/lemon 팔레트 + 3-role 폰트)으로 정합. 스코프 "풀 디자인 정합" 확인.
> **SoT: 본 리포 `proc/spec/08-디자인-시스템.md`.** 정합 대상 룩의 값은 spec/08 §8.1·§8.2 에 encode 되어 있으며, 이후 모든 작업의 권위는 spec/08(+§8.3·§8.4)이다. 외부 리포 코드/파일 참조·import 없음 — **독립 프로젝트 원칙(CLAUDE.md §7) 준수**. (디자인 방향의 origin 은 G1 의 풀림 통합 룩 지시이며, 본 리포 spec 이 이를 자립적으로 정의한다.)
> 동반 spec 개정(G1 승인 2026-07-01): `spec/08 §8.1`(팔레트)·`§8.2`(3-role 폰트) + `spec/09` 폰트 라인 정합.

## 0. 목표

풀림 제품군 **통합 룩**으로 디자인 시스템 전면 정합. 공통 셸 + `tailwind.config` 변경이라 **21개 게임 전체 영향** → 4-viewport audit 필수(merge gate), 단계별 검증. 권위는 본 리포 spec/08.

## 1. Gap 요약 (통합 룩 목표 ← games 현재)

| 항목 | 통합 룩 (목표, spec/08) | games (현재) |
|---|---|---|
| 팔레트 | ink `#0D1A1F`·paper `#F0F6FB`·blue `#0362DA`·**lemon `#E6FF4C`** + ink2~5·line/line2·paper2/3 | slate 50~900·blue·bg-primary `#FBFAF8`·type-primary `#0F172A` |
| 폰트 | Pretendard(본문) + **Bai Jamjuree**(brand) + **JetBrains Mono**(mono) | Pretendard 단독 |
| 헤더 | 72px sticky, backdrop blur, hairline | 56px(h-14) |
| 컨테이너 | 1280px, gutter `clamp(20,4vw,48)` (`.container-x`) | 1280px, px-4/6/8 |
| radii | 4/8/**18** | 4/6/8/16 |
| spacing | `--s-1~10` (4~128) | Tailwind 기본 |
| type scale | `--fs-xxs~display` (11~68) + `--lh`·`--ls` | display/body/label/helper |
| section | `--section-pad clamp(72,10vw,160)` | py-6/8 |

## 2. 전략 — 시맨틱 토큰 remap + 신규 토큰 추가 (컴포넌트 대량 재작성 회피)

games 컴포넌트·21게임이 쓰는 기존 토큰 **이름 유지**하고 **값을 web 팔레트로 remap** → 자동으로 새 룩 반영. 동시에 web 신규 토큰 추가.

- `bg-primary #FBFAF8 → paper #F0F6FB` / `border-hairline #E5E5E5 → line #D6E2EE` / `type-primary #0F172A → ink #0D1A1F` / `type-secondary → ink3 #45555C` / `accent-positive` 불변(#0362DA)
- `pullim-slate-*` 스케일 → web ink/paper 계열로 색온도 이동(cool→ink-tinted). 근사 매핑, audit 로 회귀 검출.
- **신규**: `lemon/highlight`, `pullim-ink-{2,3,4,5}`, `paper-{2,3}`, `line2`, font `brand`/`mono`, radii `lg=18`, spacing `--s-*`, `--nav-h`, `--section-pad`, `.container-x`·`.section` 유틸.

Tailwind v4 마이그레이션은 **비스코프**(games=Next15+Tailwind v3 유지) — web 토큰 값을 v3 config + globals CSS var 로 이식.

## 3. 단계 (Phase)

### Phase 1 — 디자인 파운데이션 (토큰·폰트·spec) ← 본 PR 시작
- [ ] `layout.tsx`: Bai Jamjuree + JetBrains Mono `next/font/google` 추가 → CSS var(`--font-bai-jamjuree`·`--font-jetbrains-mono`) 노출. Pretendard 현 CDN 유지.
- [ ] `globals.css`: web CSS-var 토큰 이식(:root 팔레트·semantic·spacing·radii·type·layout·font stacks) + dark theme + `.container-x`·`.section` 유틸.
- [ ] `tailwind.config.ts`: 시맨틱 remap + 신규 토큰(브랜드·mono 폰트, lemon, ink 스케일, radii-lg, spacing) 추가.
- [ ] `spec/08 §8.1·§8.2` 개정 — 팔레트(lemon·ink/paper) + 타이포(3 폰트 role) 반영. 기존 "Pretendard 단독·타 폰트 금지" → "본문 Pretendard, 브랜드 Bai Jamjuree, mono JetBrains Mono" 로 개정(G1 승인).
- [ ] `typecheck·lint·build` green.

### Phase 2 — 셸 크롬 정합
- [ ] `app-header.tsx`: 높이 72px(`--nav-h`), backdrop blur, hairline. 로고/nav web 대응.
- [ ] 컨테이너: `.container-x`(clamp gutter)로 페이지 래퍼 정합. section spacing.
- [ ] footer(있으면) web 4-col 대응.
- [ ] nav 패턴: 브레이크포인트(햄버거 <1024px)·드로어 web 대응 검토(현 <768px). — games 사이드바 구조는 games UX 특성이라 **선택적 정합**(과도 변경 회피, audit).

### Phase 3 — 회귀 정리
- [ ] `bun run ui:audit` 4-viewport(대표 라우트: `/home`·`/games/<대표>`·`/manage/content`) critical overflow 0.
- [ ] 팔레트 remap 시각 회귀(대비·가독성·lemon 남용) 수정. lemon 은 highlight 한정(하이퍼캐주얼 룰 — RPG 재화 아님).
- [ ] `bun test` green.

## 4. 리스크·가드

- **하이퍼캐주얼 룰 유지**(메모리 `feedback_scale_hypercasual`): lemon accent 는 highlight 강조만, 게임화 재화·뱃지 금지.
- **silent fallback 금지**(AGENTS.md): 미정의 토큰 클래스 누락 방지 — remap 시 기존 토큰 값만 교체, 이름 삭제는 audit 후.
- **디자인 토큰 SoT**: `tailwind.config` ↔ `spec/08 §8.1` 동시 갱신(한쪽만 = 표류).
- **4-viewport audit HARD gate**: 공통 셸·config 변경이라 머지 전 필수(AGENTS.md viewport 룰).

## 5. 검증 (자가 체크리스트)
- [x] Phase 1: typecheck·lint·build green, 폰트 3종(Pretendard·Bai Jamjuree·JetBrains Mono) 로드 확인, test 497/497
- [x] Phase 2: 헤더 72px 적용 확인 (container-x 는 Phase 3 로 이관)
- [x] **4-viewport ui:audit (merge gate, AGENTS.md)** — 2026-07-01 실측:
  - `/` (탑네비 서피스): 320·390·768·1280 **critical/informational overflow 0 PASS**
  - `/manage/content` (사이드바 서피스): 4 viewport **overflow 0 PASS**
  - 캡처: `/tmp/ui-audit/{mobile-sm-320,iphone13-390,tablet-768,desktop-1280}.png`
- [ ] Phase 3(후속): container-x·section·footer 세부 정합 + 게임 라우트(로그인) 감사
- [ ] spec/08 ↔ tailwind.config 토큰 정합(diff 0 표류)
