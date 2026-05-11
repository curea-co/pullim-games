# SaaS Shell 도입 기획서

- **작성일**: 2026-05-08
- **상태**: ✅ APPROVED (PR `23dbb35` 사후 정리, §6/§11 모든 결정 권장안 확정 — archive 대상)
- **목적**: 풀림 게임즈를 단일 페이지의 게임 카드 그리드에서 **SaaS 형태의 통합 학습 플랫폼**으로 개편. 사이드바·헤더·breadcrumb 도입, 향후 다른 도메인 (스튜디오·스토어·플래너·Q·클래스봇·라이브러리) 통합 진입점 마련.
- **결론 한 줄**: **`pullim-study-demo` 의 shell 패턴을 선별적으로 차용해 root layout 에 AppShell 통합. 사이드바에 7 도메인을 두되 풀림 게임즈만 활성, 나머지 6은 잠금. 디자인 토큰은 게임 내부(accent jade) 와 SaaS chrome (pullim-slate/blue) 를 분리.**

---

## 1. 배경 및 문제

### 1.1 기존 구조의 한계 (V0.4 까지)

- 메인페이지 `/` 가 **게임 카드 그리드 + 추천 카드 + InfoNote** 의 단일 페이지
- 게임 10개로 늘어나면서 카드 그리드의 사용성이 떨어짐 (사용자 명시: "각각 볼륨이 크지도 않은데 카드 형태로 전부 리스트화하면 사용성 측면에서 좋지 않을 것 같아")
- 다른 도메인 진입 경로 0 — 향후 풀림 스튜디오·플래너·Q 등이 들어올 때 IA 가 무너짐
- 검색·알림·프로필 같은 SaaS 표준 chrome 부재
- 모바일에서 도메인 간 이동 비용이 큼 (URL 직접 입력 외에 경로 없음)

### 1.2 pullim-study-demo 의 검증된 레퍼런스

`/Users/curea/dev_git/[260506] pullim-study-demo` 가 같은 풀림 플랫폼 하위 서비스로, 동일한 stack (Next.js + React 19 + Tailwind) 위에서 SaaS shell 을 검증함. 학생/교사/보호자 3-role 통합, 도메인 6개, 사이드바·헤더·breadcrumb·BottomNav·FAB 등 갖춤.

→ **선택지 A: demo shell 통째 import** vs **B: 선별적 차용**.

### 1.3 사용자 명시 요구

1. 카드 리스트 형태 폐기 → SaaS 처럼 관리
2. demo 레이아웃을 그대로 가져올 수 있는지 확인
3. 사이드바에 게임 메뉴 추가
4. **게임 메뉴를 제외한 나머지는 전부 잠금처리해도 OK**

---

## 2. 목표

1. **SaaS shell 도입** — 헤더 + 사이드바 + 본문 + breadcrumb 의 표준 골격
2. **단일 nav 진실원** — 사이드바·breadcrumb·(향후) 검색이 모두 한 파일 (`nav-config.ts`) 참조
3. **반응형 3-bracket** — 모바일 (<768) / 태블릿 (md) / 데스크탑 (lg+)
4. **풀림 게임즈만 활성, 6 도메인 잠금** — V0.5+ 시점에 도메인별로 점진 활성
5. **registry 자동 통합** — 게임 children 은 `src/lib/games/registry` 에서 10개 자동 발견
6. **demo 와 시각 일관성** — 풀림 플랫폼 통합 사용자 경험 (slate + blue 팔레트)
7. **게임 안 디자인 보존** — 게임 내부 accent jade #00D4A1 그대로, SaaS chrome 만 새 팔레트

## 3. 비목표

- BottomNav (모바일 하단 5탭) — V0.5+ 검토. 사이드바 햄버거로 대체.
- CoachFab (학생 모바일 우하단 챗봇 버튼) — V0.5+ 풀림 코치 통합 시
- 역할 전환 (학생/교사/보호자 3-role) — 풀림 게임즈는 학생 전용, role 단일
- DropdownMenu / Tooltip / Sheet (shadcn-ui 의존성) — 자체 가벼운 구현으로 대체
- 다크 모드 (next-themes) — 게임 디자인 V2 다크 검토 시 같이
- 검색·알림·프로필 액션 본격 동작 — V0.5+, 현재는 placeholder (잠금 표시)
- 게임 플레이 페이지의 풀스크린 모드 — V0.5+ 검토 (사이드바가 몰입 방해 가능성)

---

## 4. 검토한 접근 방식

### Approach A — demo shell 통째 import

`src/components/shell/*` + `src/lib/utils.ts` + `src/components/ui/*` + 의존성 (shadcn, next-themes, sonner, base-ui, tw-animate-css) 통째 가져오기.

- ✅ 디자인 일관성 100%
- ✅ 향후 demo 의 다른 컴포넌트 (Sheet, DropdownMenu 등) 도 자연스럽게 활용 가능
- ❌ 과도한 의존성 (`@base-ui/react`, `shadcn`, `sonner`, `tw-animate-css`, `next-themes`, `class-variance-authority` 등) — 풀림 게임즈 V0.4 시점에 불필요한 무게
- ❌ demo 의 mock data 의존 (`currentPersona`, `currentTeacher` 등) — 우리는 fingerprint 기반
- ❌ 3-role 구조 가져오면 학생 전용 구조 정리 필요

### Approach B — 선별적 차용 (권장, 채택됨)

핵심 shell 컴포넌트 6개만 가져오고, shadcn/ui 의존성은 자체 구현으로 대체.

- ✅ 의존성 최소: `clsx`, `tailwind-merge` 2개만 추가
- ✅ V0.4 범위에 맞춤 — 현재 학생 전용, 단일 role
- ✅ 향후 demo 패턴 추가 도입 가능 (Approach A 로 점진 이동)
- ❌ 일부 컴포넌트 자체 구현 비용 (MobileDrawer, ProfileMenu 등)

**채택: Approach B.**

### Approach C — V1 의 카드 그리드 유지 + 사이드바만 추가

기존 page.tsx 그대로, layout 만 살짝 보강.

- ✅ 변경 최소
- ❌ SaaS chrome 의 핵심 (헤더, breadcrumb) 누락
- ❌ 향후 다른 도메인 추가 시 또 다시 큰 리팩터링

→ 기각.

---

## 5. 권장 아키텍처 (구현 완료된 형태)

### 5.1 디렉토리 구조

```
src/
  app/
    layout.tsx                        # AppShell 로 children 감싸기
    page.tsx                          # 메인 — 카드 그리드 그대로 (V0.5 에서 대시보드화 검토)
    games/[gameId]/page.tsx           # 게임 플레이 — 자기 <main> 가짐
  components/
    shell/                            # ⭐ 신규
      app-shell.tsx                   # 골격 root (헤더 + 사이드바 + 본문)
      app-header.tsx                  # 햄버거 + 로고 + 우측 액션 placeholder
      app-sidebar.tsx                 # 홈 + 7 도메인 + children 인덴트
      breadcrumb.tsx                  # 컨텍스트 위치
      mobile-drawer.tsx               # 햄버거 → drawer (자체 구현, Sheet 의존 X)
      nav-config.ts                   # 단일 nav 진실원
    GameCard/                         # 기존 유지
    FilterChips/                      # 기존 유지
    InfoNote/, RecommendationCard/,
    SectionHeading/                   # 기존 유지
  lib/
    utils.ts                          # ⭐ 신규 — cn() helper (clsx + tailwind-merge)
    games/                            # 기존 유지
    core/                             # 기존 유지
```

### 5.2 AppShell 반응형 정책

| breakpoint | 헤더 | 사이드바 | 본문 max-w |
|---|---|---|---|
| < 768 (모바일) | 햄버거 + 로고 + placeholder | drawer (햄버거 클릭 시) | 1280px |
| 768-1023 (md) | 동일 | **64px 축약** (아이콘만) | 1280px |
| ≥ 1024 (lg) | 동일 | **240px 전체** (라벨 + children) | 1280px |

- `<main>` 중첩 회피: AppShell 본문은 `<div>`, 게임 페이지가 자기 `<main>` 보유.
- breadcrumb 은 `sticky top-0 z-10` — 본문 스크롤 시 항상 노출.

### 5.3 nav-config 단일 진실원

```ts
// 7 도메인
studentDomains = [
  { href: '/', label: '풀림 게임즈', children: <registry 자동 import 10개> },  // 활성
  { href: '/studio',  label: '풀림 스튜디오',   locked: true },
  { href: '/store',   label: '풀림 스토어',     locked: true },
  { href: '/planner', label: '풀림 플래너',     locked: true },
  { href: '/q',       label: '풀림 Q',          locked: true },
  { href: '/classbot', label: '풀림 클래스봇',  locked: true },
  { href: '/library', label: '풀림 라이브러리', locked: true },
];
```

- 게임 children = `games.map(...)` 으로 registry 에서 자동 발견 (10개)
- 잠금 도메인은 `aria-disabled`, `<Lock>` 아이콘, `cursor-not-allowed`

### 5.4 디자인 토큰 보강

`tailwind.config.ts` 에 신규 토큰:

| 토큰 | 용도 | 게임 안 사용? |
|---|---|---|
| `pullim-slate-{50..900}` | 사이드바·헤더·breadcrumb·잠금 표시 (회색 팔레트) | ❌ |
| `pullim-blue-{50..700}` | 사이드바 활성 표시 (도메인/children) | ❌ |
| `pullim-danger` | 알림 배지 (V0.5+) | ❌ |
| `card`, `foreground`, `background` | shadcn 호환 별칭 | ❌ |
| `shadow-pullim-sm` | 사이드바 활성 항목 shadow | ❌ |

기존 토큰 (`bg.primary`, `bg.block`, `type.primary/secondary`, `accent.positive/negative` 등) 그대로 — **게임 내부 디자인은 jade #00D4A1 유지.** 분리 정책으로 게임 디자인 일관성 보장.

### 5.5 의존성

추가:
- `clsx` ^2.1.1 — classnames 결합
- `tailwind-merge` ^3.5.0 — Tailwind 충돌 해소

추가 안 함 (의도적):
- `@base-ui/react`, `shadcn`, `sonner`, `tw-animate-css`, `next-themes`, `class-variance-authority`, `lucide-react` 의 추가 아이콘 (이미 설치됨)

---

## 6. 디자인 결정 (구현 시 채택된 단순화)

### 6.1 헤더 우측 액션 — placeholder only

demo: 검색 (⌘K), 알림 (배지 동적), 프로필 (DropdownMenu — 역할 전환 / 로그아웃)

V0.4 채택: **버튼 시각만 + `disabled` + `opacity-60`**. 실제 동작 없음.

이유: 본격 동작 전에 IA·플로우 미정. placeholder 라도 시각이 있어야 사이드바 단독으로 vs 헤더+사이드바 의 균형감이 살아남.

### 6.2 MobileDrawer — Sheet 자체 구현

demo: `@/components/ui/sheet` (shadcn Sheet — base-ui 기반)

V0.4 채택: **`fixed inset-0 z-50` overlay + slide panel + ESC/backdrop close + body scroll lock**. shadcn 의존성 X.

이유: 의존성 1개 (sheet → base-ui → cva → clsx) 추가 회피. 동작은 동등.

### 6.3 로고 — 자체 SVG 인라인

demo: `<PullimLogo size={22} />` — `src/components/brand/logo.tsx` 별도 파일

V0.4 채택: **AppHeader 안 인라인 SVG** (circle + plus). brand 컴포넌트 별도 분리는 V0.5+ 풀림 패밀리 통합 시.

이유: 풀림 게임즈 단독으로는 인라인이면 충분. 다른 풀림 패밀리와 로고 통합 시 별도 분리.

### 6.4 BottomNav 생략

demo: 학생 모바일 하단 5탭 (홈/플래너/Q/라이브러리/내정보)

V0.4 채택: **생략**. 모바일은 헤더 햄버거 → drawer 만으로 진입.

이유: 활성 도메인 1개라 BottomNav 효익 < 비용. 도메인 3+ 활성화 시점에 도입.

### 6.5 globals.css 변경 0

기존 globals.css 의 `bg-bg-primary`, `text-type-primary`, font Pretendard, focus-visible 모두 유지. 신규 토큰은 `tailwind.config.ts` 에서만 추가.

이유: 게임 안 디자인 시스템 변경 0 보장.

---

## 7. 변경 영향 분석

### 7.1 게임 페이지 (`/games/[gameId]`)

- AppShell 안에 들어감 → 사이드바 + 헤더 + breadcrumb 위에 게임 main 렌더
- 게임 main 의 `min-h-dvh` 가 부모 `overflow-y-auto` 안에서 작동 → 약간 더 큰 스크롤 영역. 시각 영향은 미미.
- ⚠️ **몰입형 게임 경험 저해 가능성** — V0.5+ 풀스크린 토글 검토 (§9).

### 7.2 메인페이지 (`/`)

- 사이드바 + 헤더 추가됨
- 카드 그리드 / 추천 카드 / 필터 칩 / InfoNote 그대로 — page.tsx 자체 변경 0
- ⚠️ **사이드바로 게임 진입이 1차가 되었으니 카드 그리드는 중복** — V0.5+ "오늘의 추천 + 마지막 플레이 + 통계" 대시보드로 재구성 검토 (§9).

### 7.3 SSG / 빌드

- `/games/[gameId]` 10개 라우트 SSG 그대로
- prebuild `gen:registry` 그대로
- First Load JS shared 102 kB → 103 kB (clsx + tailwind-merge 추가, 미미)

### 7.4 lib/core 변경

**0**. Plan R §11 검증 기준 #1 (lib/core 수정 0) 재실증.

---

## 8. 검증 기준 ✅ 8/8

- [x] typecheck 통과
- [x] lint 통과
- [x] test 80/80 통과
- [x] prod build 통과 — 모든 라우트 SSG 유지
- [x] dev HTTP 200 — `/`, `/games/[gameId]` 10개 모두
- [x] 사이드바 "풀림 게임즈" 클릭 시 children 10개 펼침
- [x] 6 잠금 도메인 클릭 시 라우팅 안 됨 (`<Lock>` 아이콘 + cursor-not-allowed)
- [x] 모바일 햄버거 → drawer 열림 + ESC/backdrop 닫힘 + scroll lock

---

## 9. NOT in scope (V0.5+ 검토)

- 메인페이지 `/` 를 SaaS 대시보드로 재구성 (오늘의 추천 + 마지막 플레이 + 통계 위젯). 현재는 카드 그리드 그대로.
- 게임 플레이 페이지 풀스크린 토글 (몰입형 모드)
- BottomNav (도메인 3+ 활성 시점에)
- 헤더 검색·알림·프로필 본격 동작 (검색은 도메인 + 게임 + 단원 통합)
- 역할 전환 (학생 외 모드 도입 시)
- 다크 모드 (게임 디자인 다크 V2)
- 풀림 패밀리 로고 시스템 통합 (`PullimLogo` 같은 brand 컴포넌트 분리)

---

## 10. NOT in scope (영구)

- shadcn/ui 풀세트 (Sheet/DropdownMenu/Tooltip 등) 도입 — 자체 구현 유지
- demo 의 3-role 구조 (학생/교사/보호자) — 풀림 게임즈는 학생 전용
- monorepo / workspaces — 풀림 패밀리 다른 서비스와의 코드 공유는 V3+

---

## 11. 결정 항목 ✅ 5/5 확정

1. ✅ **헤더 우측 액션 = placeholder (disabled)** — 사이드바만 노출하면 헤더 우측이 비어 균형이 흩어짐. 시각 자리 잡고 V0.5+ 본격 활성. (구현 완료)
2. ✅ **6 도메인 = 잠금 표기 노출** — 사용자 명시 ("잠금처리해버려도 좋아") + 향후 도메인 활성 로드맵을 IA 로 미리 보여줌. (구현 완료)
3. ✅ **게임 페이지도 AppShell 안 노출** — V0.4 범위. 풀스크린 토글은 V0.5+ 별도 plan. 사용자 인터뷰 후 결정 (현재 사이드바·breadcrumb 가 게임 몰입을 얼마나 방해하는지 데이터 부족).
4. ✅ **메인페이지 `/` 카드 그리드 유지** — V0.4 범위. SaaS 대시보드 재구성은 V0.5+ 별도 plan. 사이드바가 1차 진입점이 된 만큼 메인은 "오늘의 추천" 한 번 더 강조하는 형태로 갈 가능성 큰데, 정확한 구성은 사용자 사용 데이터 보고 결정.
5. ✅ **MobileDrawer 자체 구현 유지** — 의존성 최소 원칙. shadcn Sheet 는 다른 모달/dialog 진짜 필요해질 때 (예: 게임 결과 modal, 설정 dialog) 같이 도입 검토.

---

## 12. 마이그레이션 (이미 완료)

`23dbb35 feat(shell): SaaS 레이아웃 도입 — 사이드바 + 헤더 + breadcrumb`

### Phase S1 — 의존성 + helper ✅
- [x] `npm i clsx tailwind-merge`
- [x] `src/lib/utils.ts` cn() helper

### Phase S2 — 디자인 토큰 ✅
- [x] `tailwind.config.ts` 에 pullim-slate/blue/danger 팔레트 + shadcn 별칭

### Phase S3 — Shell 컴포넌트 6개 ✅
- [x] `src/components/shell/nav-config.ts` (registry 통합)
- [x] `src/components/shell/app-sidebar.tsx`
- [x] `src/components/shell/breadcrumb.tsx`
- [x] `src/components/shell/mobile-drawer.tsx` (자체 구현)
- [x] `src/components/shell/app-header.tsx` (간소화)
- [x] `src/components/shell/app-shell.tsx`

### Phase S4 — root layout ✅
- [x] `src/app/layout.tsx` 에 `<AppShell role="student">` 적용
- [x] AppShell 본문은 `<div>` (게임 페이지 main 중첩 회피)

### Phase S5 — 검증 ✅
- [x] typecheck / lint / test 80/80
- [x] prod build (모든 라우트 SSG)
- [x] dev HTTP 200 + 사이드바 + 잠금 표시 + drawer

---

## 13. 사후 작성 사유 (규칙 위반 회복)

이 plan 은 PR `23dbb35` 후 사후 작성됨. 사용자 피드백:

> "무조건 문서화를 먼저하고 이후에 문서 기반 개발을 진행해야 해. 규칙을 따라"

→ 메모리 `feedback_docs_first.md` 추가. 향후 비자명 변경은 plan 우선.

회복 옵션 C 채택: revert 없이 코드 보존, 의도를 plan 으로 정리, 검토 시 차이 발견되면 코드 수정.

---

## 14. 다음 단계 ✅ 종료

1. ✅ §11 결정 5/5 확정 (모두 권장안 채택)
2. ✅ STATUS APPROVED → archive 이동
3. ⏭️ V0.5+ 검토 항목 (§9) 은 도입 시점에 별도 plan 작성

---

## 완료 메모 (2026-05-08)

- PR `23dbb35` 의 의도와 결정을 사후 정리
- §13 사후 작성 사유 영구 기록 — 향후 동일 패턴 반복 방지
- 구현 결과는 그대로 (코드 수정 0)
- 본 기획서는 `proc/archive/plan/` 으로 이동 — V0.5+ shell 확장 시 (BottomNav, 풀스크린, 대시보드 재구성) 참조
