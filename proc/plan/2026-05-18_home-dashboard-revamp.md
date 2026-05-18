# 2026-05-18 — 홈 대시보드 개편 (landscape + 그래픽 성과)

- **상태**: ACCEPTED (2026-05-18) — §1 합의 완료. D1~D5 모두 A 채택. 오늘 진행 범위 = Phase 1~2 (레이아웃 + 히트맵). Phase 3~4 별 트랙.
- **트리거**: 사용자 피드백 — "홈이 대시보드 성격 떨어짐. 게임 성과는 카드가 아닌 다른 그래픽. 너비가 세로로 좁음, landscape 반응형 재설계."
- **메모리 룰**: 하이퍼캐주얼 유지 (memory: feedback_scale_hypercasual), 학습효과 > 중독성 (memory: feedback_design_priorities). 그래픽은 정보 전달 우선, 게이미피케이션 보상 X.
- **연관 plan**: `proc/archive/plan/2026-05-08_home-dashboard-redesign.md` (현 홈 설계의 시작점).
- **연관 spec**: `proc/spec/08-디자인-시스템.md`.

---

## 0. 현 상태 분석

### A. 현 홈 (`src/app/page.tsx` line 50)

```
<main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
```

- **컨테이너**: `max-w-[720px]` — 데스크톱·태블릿에서 좌우 여백 과다.
- **레이아웃**: 단일 컬럼 flex. 모바일·태블릿·데스크톱 모두 같은 폭.
- **섹션 순서**: 인사말 → KPI 2장 (성공/실패 절댓값) → 게임별 성과 (`GameStatCard` `sm:grid-cols-2`) → 미진행 게임 그리드 → 추천 (`RecommendationCard` 하단)

### B. 게임별 성과 — 현 카드 (`GameStatCard`)

- 게임명·아이콘·진행률 바·성공/실패 절댓값. 카드 형태.
- 21 게임 풀어본 사용자는 21개 카드 스크롤 — landscape 활용 0.

### C. 추천 — 현 위치

- `RecommendationCard` 화면 **하단**. 사용자 의도("오늘 할 게임")와 시각 우선순위 불일치 — 가장 위에 와야 함.

### D. 스탯 데이터 (`computeDashboardStats`)

이미 보유한 신호:
- `streak.current` (일일 연속)
- `todayAttempts` (오늘 푼 카드 수)
- `dueSoonCount` (24h 내 due 카드)
- `perGame[i]` — `attempts`/`correct`/`failed`/`accuracy`/`lastReviewAt`

**미보유 신호 — Phase 2에서 보강**:
- 게임별 일별 활동 (히트맵용) — 현재는 합계만, 일별 분포 없음
- 게임별 attempts 추이 (sparkline용) — 시계열 X

→ 일별 분포는 `srs.fsrsCard.last_review` + `revlog` 부재로 직접 산정 어려움. 별 키 (`pullim-games:activity-log:<gameId>`) 신규 또는 streak-history 패턴 차용 (V0.4 spec).

---

## 1. 추천 설계 — landscape + grid + 그래픽

### A. 컨테이너 너비

- **(A 추천)** `max-w-7xl` (1280px) — landscape 데스크톱·태블릿 모두 활용.
- (B) `max-w-6xl` (1152px) — 더 보수적.
- (C) `max-w-screen-2xl` (1536px) — 24인치+ 모니터까지. 너무 넓어 정보 밀도 ↓.

→ A 채택. 모바일·작은 태블릿은 영향 X (max-w-* 는 상한).

### B. Grid 레이아웃 — 3 breakpoint

```
모바일 (< md, ~768px)        | 태블릿 (md~lg, 768~1024px)  | 와이드 (lg+, 1024px+)
────────────────────────────┼─────────────────────────────┼──────────────────────────────
[ 추천 ]                     | [ 추천 (col-span-2) ]        | [ 추천 (col-span-3) | streak·due (col-span-2) | activity heatmap (col-span-7) ]
[ streak·due ]               | [ streak·due  | activity ]   | [ KPI 2 카드 (col-span-3) | activity heatmap 이어짐 ]
[ activity heatmap ]         | [ activity heatmap 이어짐 ]  | ──────────────────────────────
[ KPI 2 카드 ]               | [ KPI 2 카드 ]               | [ 게임별 성과 그리드 (col-span-12, lg:grid-cols-3 또는 4) ]
[ 게임별 성과 그리드 ]        | [ 게임별 성과 (grid-cols-2) ] |
[ 미진행 게임 ]              | [ 미진행 게임 ]              | [ 미진행 게임 (col-span-12) ]
```

- **추천 영역 = 좌상 큰 카드** — 모바일은 전체 폭, 와이드는 col-span-3 (~25%).
- **activity heatmap = 우상 메인** — 14일 × 21 게임 (또는 7일 × 모든 게임 — Phase 2 §2.2에서 결정).
- **streak·due·todayAttempts = 작은 status 칩** — 중앙 상단.
- **게임별 성과 그리드 (col-span-12 row 2)** — 모바일 1열, md 2열, lg 3~4열. 각 카드 sparkline 1개.

→ Tailwind `grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4` + `col-span-{n}` 슬롯 명시.

### C. 게임별 성과 그래픽

**(A 추천) 활동 히트맵 + sparkline 조합**:

1. **메인 히트맵** (`<ActivityHeatmap />`):
   - X축 = 최근 14일, Y축 = 게임 (gamesPlayed 만).
   - 셀 색상 = 해당일 attempts (0=배경 / 1~3=연 / 4~10=중 / 11+=진). 색상은 디자인 시스템 accent-positive 단조.
   - hover/tap: "math-quick-quiz · 2026-05-17 · 12장" 툴팁.
   - 21 게임 다 풀어본 경우 14×21 셀 = 294 셀. 비풀이 게임은 행 생략(gamesPlayed only).

2. **카드 안 sparkline** (`<GameSparkline />`):
   - 게임별 카드의 진행률 바 대체 — 최근 7일 attempts mini chart (SVG path).
   - 카드 정보: 게임명 + 아이콘 + sparkline + 큰 숫자(누적 정답 N번) + accuracy %.
   - 카드 컴팩트화 — height ↓, 와이드에서 4열 그리드 가능.

**대안 분석 (배제)**:

| 안 | 형태 | 채택? | 근거 |
|---|---|---|---|
| B | Radar chart (정확도·속도·진행률·due·streak 다축) | 배제 | 학생에게 복잡, "성공·실패" 직관 사라짐 |
| C | 도넛/원형 진행률 (게임별 cardsTouched/cardsTotal) | 배제 | 현 진행률 바 대비 정보량 동일, 시각만 변경 |
| D | Bar chart (게임별 attempts 비교) | 배제 | 21 게임 가로 bar 비교는 의미 약함 |
| **A** | **히트맵 + sparkline 조합** | **채택** | 시간축(히트맵) + 게임별 추이(sparkline) 정보 보강. 외부 lib 없이 SVG로 구현 가능 |

### D. 추천 영역 강화

- **(A 추천)** 좌상 큰 카드 + due-soon 수 + streak 동시 표시. 클릭 시 즉시 게임 진입.
- 모바일은 화면 첫 화면(above the fold) 차지 → "오늘 풀 게임 1" 의도 즉시 전달.

### E. 색상·톤

- 히트맵 셀 — `accent-positive` (디자인 시스템 §08) 단조 그라디언트. 빨간색·금색 X (외재 보상 회피).
- sparkline — `accent-positive` 1색.
- 보상감·축하 모션 X (CorrectBurst 외).

---

## 2. 결정점

### D1 — 컨테이너 너비
- **(A 추천)** `max-w-7xl` (1280px).
- (B) `max-w-6xl` (1152px).

→ A 채택.

### D2 — 그래픽 형태
- **(A 추천)** 히트맵 + sparkline 조합.
- (B) 히트맵만.
- (C) sparkline만.

→ A 채택 (시간축 + 게임별 추이 동시).

### D3 — 추천 영역 위치
- **(A 추천)** 좌상 큰 카드 (모바일 첫 화면).
- (B) 화면 중앙 큰 hero.
- (C) 현 하단 유지.

→ A 채택.

### D4 — 일별 활동 데이터 소스
- **(A 추천)** 신규 `pullim-games:activity-log:<gameId>` localStorage 키 — `saveSrsAndRecord` 동거 wrapper 안에서 일별 attempts count up. 14일 retention.
- (B) `revlog` 풀 로깅 — ts-fsrs 5.x의 Revlog 기능 활용. 데이터 크기 ↑.
- (C) FSRS state 의 `last_review` + `reps` 로부터 간접 산정 — 일별 분포 추정 불가능.

→ A 채택 (Phase 2 신규).

### D5 — 미진행 게임 그리드 위치
- **(A 추천)** 현 위치 유지 (하단). 와이드는 col-span-12 1행.
- (B) 사이드 패널 (와이드에서 우측 sticky).

→ A 채택 (현 디자인 유지).

---

## 3. 작업 항목

### Phase 1 — 레이아웃 컨테이너 + grid 슬롯 ✅
- [x] `src/app/page.tsx` 컨테이너 `max-w-[720px]` → `max-w-7xl` (+ `lg:px-8`).
- [x] `<Dashboard />` 본문 — `flex flex-col` → `grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4` + 섹션마다 `col-span-{n}` 슬롯.
- [x] 추천 영역 화면 상단 이동 (RecommendationCard 좌상, 와이드 col-span-4).
- [x] streak·due-soon·todayAttempts 칩 묶음 신규 `DashboardStatusRow.tsx` 컴포넌트.
- [x] e2e home-dashboard-layout.spec.ts 신규 3건 + streak.spec.ts 업데이트 (status row 위치 변경 반영).
- [x] e2e 163 → 166 (+3) 회귀 0.

### Phase 2 — Activity 히트맵 ✅
- [x] `src/lib/core/storage/activity-log.ts` 신규 — `recordGameActivity(gameId, now)` (streak.recordActivity 와 충돌 회피 prefix) + `loadActivity(gameId, days)` + `loadActivityForGames(gameIds, days)` + 14일 retention prune.
- [x] `saveSrsAndRecord` wrapper 안에 activity-log 동거 갱신 — 정답·오답 모두 `recordGameActivity` 호출.
- [x] `src/components/dashboard/ActivityHeatmap.tsx` 신규 — SVG 14일 × N 게임 셀. accent-positive 단조 색상 (5 intensity bucket).
- [x] 히트맵 hover/tap 툴팁 (게임명·날짜·count).
- [x] 홈 dashboard grid 의 `col-span-12` 와이드 슬롯에 배치 — 게임별 성과 그리드 위에 위치.
- [x] vitest 신규 11건 (toDateBucket·빈 storage·1회·누적·다른 날짜·retention prune·multi-game·loadForGames·손상 JSON·clear·SSR).
- [x] e2e 2건 신규 (정답 후 히트맵 노출 + 미플레이 미노출).
- [x] e2e 166 → 168 (+2) 회귀 0.

### Phase 3 — GameSparkline + 게임별 카드 컴팩트화 (PR #N3)
- [ ] `src/components/dashboard/GameSparkline.tsx` 신규 — 7일 attempts SVG mini chart (path `d` 생성).
- [ ] `GameStatCard` 진행률 바 → sparkline 대체. 카드 height ↓ — 3열 그리드 호환.
- [ ] 와이드에서 게임별 성과 그리드 `lg:grid-cols-3` (또는 4 — UI 검증 후 결정).
- [ ] vitest — GameSparkline render·빈 데이터 fallback 2건.

### Phase 4 — 추천 영역 강화 (PR #N4)
- [ ] `RecommendationCard` 좌상 큰 카드 톤 (현 디자인보다 강한 hero) + due-soon 수·streak 함께 표시.
- [ ] CTA "지금 풀기" 큰 버튼.
- [ ] 추천 카드 없을 때 (모든 게임 due 아님) — "오늘은 휴식해도 좋아요" placeholder.
- [ ] e2e — `/` 진입 시 추천 카드가 첫 화면 above the fold.

### Phase 5 — 검증 + audit 갱신
- [ ] typecheck/lint PASS.
- [ ] vitest 185+/185+ PASS.
- [ ] e2e 161+/161+ 회귀 0.
- [ ] mobile (390x844) / tablet (768x1024) / desktop (1280x800) / wide (1920x1080) 4 viewport 모두 verify.
- [ ] `proc/audit/2026-05-18_games-catalog-audit-v3.md` 갱신 — UI 차원 finding 행 추가.
- [ ] plan §1~§4 [x] 완결 → archive.

---

## 4. 비스코프 (별 plan 트리거)

- **외부 차트 라이브러리** (recharts/d3) — 안 씀. SVG 직접 구현 (의존성 ↑ 회피).
- **랭킹·리더보드** — 메모리 룰 *하이퍼캐주얼* 위반. 영구 비스코프.
- **게임별 상세 페이지** — 클릭 시 게임 페이지 진입 (현 패턴 유지). 별 dashboard 상세 X.
- **연도별 활동 캘린더** (GitHub-style) — V0.4+ 별 plan.
- **PWA push 알림** — 별 plan.

---

## 5. 영향도

| 영역 | 변경 | 추정 LOC |
|---|---|---|
| `src/app/page.tsx` | 레이아웃 grid 재구성 | ≈+30/-15 |
| `src/components/dashboard/ActivityHeatmap.tsx` (신규) | SVG 컴포넌트 | ≈100 |
| `src/components/dashboard/GameSparkline.tsx` (신규) | SVG 컴포넌트 | ≈60 |
| `src/components/dashboard/DashboardStatusRow.tsx` (신규) | streak·due·todayAttempts 칩 묶음 | ≈40 |
| `src/components/dashboard/GameStatCard.tsx` | sparkline 통합 + 컴팩트화 | ≈+10/-20 |
| `src/components/RecommendationCard/` | hero 톤 강화 | ≈+25/-10 |
| `src/lib/core/storage/activity-log.ts` (신규) | localStorage 일별 attempts | ≈70 + test 50 |
| `src/lib/core/storage/srs.ts` | activity-log 동거 wrapper | ≈+3 |
| e2e | 모바일·태블릿·데스크톱 회귀 + 히트맵 spec | ≈+30 |

→ 총 ≈+350 LOC 추가, ≈-50 LOC 감소. 5 PR 분할.

---

## 6. 사용자 합의 필요 항목

§2 D1~D5 채택안 5건 + 오늘 진행 범위 (Phase 1 만 / Phase 1~2 / 전체) — 합의 후 진입.
