# 사이드바 IA 재구성 + 소개하기 페이지

- **작성일**: 2026-05-08
- **상태**: DRAFT (사용자 검토 후 APPROVED → 개발 진입)
- **분량**: M
- **선행 의존**: `proc/archive/plan/2026-05-08_saas-shell-introduction.md` (SaaS shell 골격)
- **후속 plan**:
  - `2026-05-08_home-dashboard.md` — 홈 페이지
  - `2026-05-08_game-hub.md` — 게임 허브 페이지
  - `2026-05-08_management.md` — 관리 페이지
- **결론 한 줄**: **사이드바 children 펼침을 폐기하고 4개 최상위 메뉴(홈·게임 허브·관리·소개하기)로 평탄화. 게임 진입은 "게임 허브" 안에서 처리. 풀림 패밀리 다른 도메인(스튜디오·스토어·플래너 등) 잠금 표기는 제거 — 풀림 게임즈는 자체 SaaS 로 운영, 플랫폼 통합은 V2 풀림 SSO 시점에.**

---

## 1. 배경 및 문제

### 1.1 현재 사이드바의 문제 (PR `23dbb35` 시점)

- "풀림 게임즈" 도메인을 클릭하면 children 으로 게임 10개가 인덴트로 펼쳐짐
- 사용자 명시: "지금 좌측 사이드바 하위에 서브 메뉴로 모든 게임들이 나열되어 있는데, 이러지 마"
- 풀림 패밀리 다른 도메인 6개 (스튜디오·스토어·플래너·Q·클래스봇·라이브러리) 잠금 표기 — 풀림 게임즈가 단독 SaaS 로 가는 길을 흐림

### 1.2 IA 재구성 방향

사이드바는 **풀림 게임즈 안의 4개 영역** 만 노출. 다른 풀림 패밀리 도메인은 V2 풀림 SSO 통합 시점에 도입 검토.

---

## 2. 목표

1. 사이드바를 4개 최상위 메뉴로 평탄화
2. 사이드바에 게임 children 펼침 폐기 — 게임은 "게임 허브" 안에서만 노출
3. 풀림 패밀리 잠금 도메인 6개 제거 (V2 SSO 시점에 별도 plan)
4. 4개 메뉴의 라우트 + breadcrumb + 활성 표시 정합 유지
5. 모바일 drawer 동일 패턴 유지

## 3. 비목표

- 풀림 패밀리 통합 IA (스튜디오·스토어·플래너 등)
- 메뉴 4개 외 추가 (예: 설정, 도움말, 로그) — V0.5+ 검토
- 사이드바 collapse 토글 (icon-only ↔ full) 사용자 수동 — 현재 viewport 기준 자동 분기 유지

---

## 4. IA 정의

### 4.1 4개 최상위 메뉴

| 라벨 | 라우트 | 아이콘 | 설명 |
|---|---|---|---|
| **홈** | `/` | `Home` | 사용자 대시보드 — 진행한 게임 / 성공·실패 통계 |
| **게임 허브** | `/games` | `Gamepad2` | 모든 게임 모음 — 4 뷰 전환 + 촘촘한 필터링 + 나만의 게임 |
| **관리** | `/manage` | `Settings` | 과목·교육과정·사용자 콘텐츠로 게임 커스텀 |
| **소개하기** | `/about` | `BookOpen` | 풀림 게임즈 소개 + 메커닉 결 + 6 핵심 원칙 |

### 4.2 라우트 변경 매트릭스

| 기능 | 기존 | 신규 | 비고 |
|---|---|---|---|
| 메인 진입 | `/` (게임 카드 그리드) | `/` (대시보드) | page.tsx 통째 교체 — `home-dashboard.md` |
| 게임 모음 | (없음) | `/games` (허브) | 신규 — `game-hub.md` |
| 게임 플레이 | `/games/[gameId]` | `/games/[gameId]` (그대로) | 라우트 동일, 진입 경로만 변경 |
| 관리 | (없음) | `/manage` 및 sub | 신규 — `management.md` |
| 소개하기 | (없음) | `/about` | 신규 — 본 plan §6 |

→ ⚠️ **`/` 의 의미 변경**: 카드 그리드 → 대시보드. 기존 `app/page.tsx` 의 추천 카드·필터 칩·게임 그리드는 `/games` (게임 허브) 로 옮김.

### 4.3 sitemap

```
/                      홈 (대시보드)
/games                 게임 허브
/games/[gameId]        게임 플레이 (10개)
/manage                관리 홈
/manage/subjects       과목 설정
/manage/curriculum     교육과정 매핑
/manage/content        사용자 콘텐츠 (문제·본문)
/manage/custom-games   나만의 게임 목록
/about                 소개하기
/api/event             기존 유지
```

세부 sub-route 는 후속 plan 에서 확정. 본 plan 은 최상위 4 메뉴만.

---

## 5. 사이드바 동작

### 5.1 아이템 정의 (nav-config.ts 재작성)

```ts
// pseudo
studentDomains = [
  { href: '/',        label: '홈',        icon: Home,      description: '대시보드 — 진행 통계' },
  { href: '/games',   label: '게임 허브', icon: Gamepad2,  description: '모든 게임 모음 + 나만의 게임', matchPrefix: ['/games'] },
  { href: '/manage',  label: '관리',      icon: Settings,  description: '과목·교육과정·콘텐츠 커스텀',     matchPrefix: ['/manage'] },
  { href: '/about',   label: '소개하기',  icon: BookOpen,  description: '풀림 게임즈 소개' },
];

// children 모두 제거 — 사이드바에는 펼침 없음
```

- `studentHomeItem` 폐기 — `/` 가 첫 메뉴 자체
- `gamesSection` (10개 children) 폐기 — 게임 진입은 `/games` 안에서

### 5.2 활성 표시 규칙

- `/` → "홈" 활성
- `/games`, `/games/[gameId]` → "게임 허브" 활성 (matchPrefix)
- `/manage`, `/manage/*` → "관리" 활성
- `/about` → "소개하기" 활성

### 5.3 breadcrumb 동작

```
/                      → 풀림 게임즈
/games                 → 풀림 게임즈 > 게임 허브
/games/factorization   → 풀림 게임즈 > 게임 허브 > 인수분해 블록 분리
/manage                → 풀림 게임즈 > 관리
/manage/subjects       → 풀림 게임즈 > 관리 > 과목
/about                 → 풀림 게임즈 > 소개하기
```

`buildBreadcrumb()` 함수 단순화 — children 펼침 없으니 매칭 로직 간단.

### 5.4 모바일 drawer

기존 동일. 4 메뉴라 drawer 안 콘텐츠가 짧아져 시각적으로 더 깔끔.

---

## 6. 소개하기 페이지 설계 (`/about`)

### 6.1 목적

신규 사용자에게 풀림 게임즈가 "왜 다른가" 한 페이지로 전달. 외재 보상·중독성 회피·학습 효과 우선 가치를 시각·언어로 보여주기.

### 6.2 IA

```
1. Hero
   - "푸는 게 곧 배우는 거예요" 슬로건
   - 1줄 부제: "5분, 손가락으로 푸는 학습 게임 10종"
   - CTA: "게임 허브로" → /games

2. 핵심 원칙 6 (proc/spec/01 §6 차용)
   - 학습 효과 우선
   - PVE 지향, 비교 X
   - 외재 보상 최소화
   - 단일 백본 (FSRS)
   - 한국어 톤 — 존댓말
   - 모바일 우선

3. 메커닉 결 5종
   - manipulation / sorting / matching / multiple-choice / typing
   - 각 결의 wow 모먼트 한 줄 + 대표 게임 1개

4. 게임 라인업 매트릭스 (5×5)
   - 메커닉 × 과목 시각 배치
   - 클릭 시 해당 게임 카드 펼침 → /games/[id] 링크

5. 학습 백본 안내
   - "어떤 게임을 풀어도 같은 카드 풀에 쌓여요"
   - FSRS 1줄 설명 (전문 용어 X)
   - 데이터 익명·로컬 저장 안내 (proc/spec/01 §1 fingerprint 정책)

6. 풀림 패밀리 안내 (V2 SSO 시점에 노출)
   - 현재는 hidden — 풀림 게임즈는 단독 SaaS
   - V2 시점에 활성

7. CTA
   - "지금 시작하기" → /games (또는 추천 게임 직접)
   - "데이터·정책 더 보기" → footer link (V0.5+)
```

### 6.3 비주얼 톤

- 풀림 게임즈 게임 안 디자인 시스템 (jade #00D4A1 + 절제) 그대로
- SaaS chrome (pullim-slate/blue) 위에 게임 안 디자인 카드 형태로 sections 구성
- 폭죽·과한 강조 X (외재 보상 회피 원칙 visual 단계까지 일관)

### 6.4 구현 범위

- 정적 콘텐츠만 — 데이터 로딩 X, 인터랙션 0 (외부 링크만)
- `app/about/page.tsx` 단일 server component
- 별도 컴포넌트는 SectionHeading, GameCard 재사용

---

## 7. 라우트 충돌 / 마이그레이션

### 7.1 `/` 의 의미 변경 영향

기존 `/` 의 콘텐츠 (게임 카드 그리드 + 추천 카드 + 필터 칩 + InfoNote) 가 `/games` 로 이동.

→ **기존 `/` 의 콘텐츠는 별도 plan (`game-hub.md`) 에서 다룸**. 본 plan 에서는 `/` 를 비우고 대시보드 placeholder 만.

### 7.2 임시 placeholder 정책

본 plan 만 머지될 경우 (다른 plan 미착수 시점):
- `/` → "홈 대시보드 준비 중" placeholder
- `/games` → 기존 메인페이지 콘텐츠 그대로 옮긴 형태
- `/manage` → "관리 페이지 준비 중" placeholder
- `/about` → 본 plan §6 그대로 구현

→ 각 페이지가 별도 plan 으로 본격 구현될 때까지 placeholder. 사이드바 메뉴 자체는 모두 활성 (잠금 X).

### 7.3 외부 링크 영향

- 사용자 북마크: `/` → 그대로 진입 가능 (대시보드 또는 placeholder)
- SNS 공유 OG: 메인페이지 OG 메타 그대로 유지
- 검색 엔진: `/` 가 대시보드면 "오늘 학습 시작" 같은 액션 위주 콘텐츠라 SEO 효과 변동 — V0.5+ 검토

---

## 8. 변경 영향 분석

### 8.1 기존 코드 영향

| 파일 | 영향 |
|---|---|
| `src/components/shell/nav-config.ts` | 재작성 — 4 메뉴, children 폐기, 잠금 도메인 제거 |
| `src/components/shell/app-sidebar.tsx` | 단순화 — children 인덴트 로직 제거 |
| `src/components/shell/breadcrumb.tsx` | 그대로 (buildBreadcrumb 만 nav-config 따라 동작) |
| `src/app/page.tsx` | 콘텐츠를 `/games` 로 이동 후 placeholder 또는 dashboard |
| `src/app/games/[gameId]/page.tsx` | 그대로 |
| `src/app/about/page.tsx` | 신규 |
| `src/app/games/page.tsx` | 신규 (`game-hub.md` 가 본격 구현) |
| `src/app/manage/page.tsx` | 신규 placeholder (`management.md` 가 본격 구현) |

### 8.2 lib/core 영향

**0**. nav 와 page 만 바뀜.

### 8.3 디자인 토큰 영향

**0**. PR `23dbb35` 의 토큰 보강 그대로 사용.

---

## 9. 단계별 구현

### Phase N1 — nav-config 재작성 + 사이드바 단순화 (0.5일)
- [ ] `nav-config.ts` 재작성 (4 메뉴, children 폐기)
- [ ] `app-sidebar.tsx` 의 children 인덴트 로직 제거
- [ ] `buildBreadcrumb` 동작 검증

### Phase N2 — placeholder 페이지 4개 (0.5일)
- [ ] `app/page.tsx` → "홈 대시보드 준비 중" placeholder
- [ ] `app/games/page.tsx` → 기존 메인 콘텐츠 (카드 그리드 + 필터 + 추천) 이전
- [ ] `app/manage/page.tsx` → "관리 페이지 준비 중" placeholder
- [ ] `app/about/page.tsx` → 본격 구현 (§6)

### Phase N3 — 검증 (0.25일)
- [ ] typecheck / lint / test
- [ ] dev: 사이드바 4 메뉴, 활성 표시, breadcrumb 4 케이스
- [ ] prod build, SSG 라우트 갱신

**총 소요: 1.25일.**

---

## 10. 검증 기준

- [ ] 사이드바에 children 펼침 0 (모든 메뉴가 단일 행)
- [ ] 4개 메뉴 모두 활성 진입 가능 (잠금 0)
- [ ] `/games/[gameId]` 진입 시 사이드바 "게임 허브" 활성
- [ ] `/manage/*` 진입 시 사이드바 "관리" 활성
- [ ] breadcrumb 4 케이스 모두 정상 (홈·허브·플레이·관리·소개)
- [ ] 모바일 drawer 가 4 메뉴만 노출
- [ ] typecheck / lint / test 80/80 / build 통과

---

## 11. NOT in scope

- 풀림 패밀리 도메인 (스튜디오·스토어·플래너·Q·클래스봇·라이브러리) — V2 풀림 SSO 시점에 별도 plan
- 검색 (⌘K), 알림, 프로필 본격 동작 — `saas-shell-introduction.md` §9 와 동일
- BottomNav, 풀스크린 토글 — 동일

---

## 12. 결정 (확정)

1. ✅ **사이드바 children 펼침 폐기** — 사용자 명시 요구
2. ✅ **풀림 패밀리 잠금 도메인 제거** — 풀림 게임즈 단독 SaaS, V2 SSO 시점에 도입
3. ✅ **`/` 의미 변경** = 대시보드. 기존 게임 그리드는 `/games` 로 이동
4. ✅ **소개하기 페이지 정적** — 데이터 로딩·인터랙션 0
5. ✅ **placeholder 정책** — 본 plan 머지 후 다른 페이지는 placeholder. 후속 plan 머지 시점에 본격 구현

---

## 13. 다음 단계

1. 본 plan 검토 (`nav-ia-restructure.md`)
2. 동시에 검토:
   - `home-dashboard.md` — 홈 페이지 본격 구현
   - `game-hub.md` — 게임 허브 본격 구현
   - `management.md` — 관리 페이지 본격 구현
3. 4 plan 모두 합의 시 단계별 머지 (N1~N3 → 각 페이지 plan)
4. 또는 부분 합의 (예: nav 만 합의 → 다른 페이지는 placeholder 로 시작)
