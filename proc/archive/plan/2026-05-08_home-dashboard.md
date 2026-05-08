# 홈 대시보드 페이지 (`/`)

- **작성일**: 2026-05-08
- **상태**: DRAFT (사용자 검토 후 APPROVED → 개발 진입)
- **분량**: M
- **선행 의존**:
  - `2026-05-08_nav-ia-restructure.md` (4 메뉴 IA 확정, `/` 가 대시보드)
- **결론 한 줄**: **`/` 를 사용자 학습 진행 대시보드로. 어제까지 누적 + 오늘 진행을 한 화면에 — 진행한 게임 수, 푼 카드 수, 정답률, 게임별 성적 분포, "오늘 다시 만날 카드" 추천. 외재 보상 (점수·랭크·콤보) 회피 원칙 일관, 데이터 자체가 보상.**

---

## 1. 배경 및 문제

### 1.1 사용자 명시 요구

> "홈은 현재 사용자가 어떤 게임을 얼마나 성공했고, 얼마나 실패했고, 몇 개의 게임을 진행했는지 확인할 수 있는 일종의 대시보드"

### 1.2 데이터 source

이미 갖춰진 인프라:
- **FSRS state** ([src/lib/core/storage/srs.ts](../../src/lib/core/storage/srs.ts))
  - 키: `pullim-games:srs:<gameId>:<cardId>`
  - 카드별 stability, difficulty, lastReview, due, reps, lapses
- **이벤트 로그** ([src/lib/core/event/logger.ts](../../src/lib/core/event/logger.ts))
  - 클라이언트 sendBeacon → `/api/event` (현재는 dev console.log 만, prod silent)
  - 액션: `session-start`, `session-end`, `submit`, `transform`, `drag-start`, `drag-end`, `abandon`
- **추천 알고리즘** ([src/lib/core/recommendation/today.ts](../../src/lib/core/recommendation/today.ts))
  - 가장 잊기 직전 카드 → 그 카드를 다루는 게임 추천

### 1.3 데이터 한계

- **이벤트 로그가 클라이언트만** — sendBeacon 후 서버 영구 저장 X (현재는 console.log 로만). 통계는 **현재 세션 + localStorage 기반**.
- **localStorage 기반 통계** = 같은 디바이스·브라우저만 추적. 멀티 디바이스 X.
- 정확한 성공/실패 횟수를 누적 추적하려면 **이벤트 로컬 캐싱** 필요 (V0.5 데이터 인프라 plan).

### 1.4 V0.5 의 현실적 범위

이번 plan 은 **localStorage 기반 단일 디바이스 통계**.
- FSRS state 에서 직접 추출 가능: 카드별 reps (시도 횟수), lapses (실패 횟수), due (다음 만남)
- 이벤트 로그 추가 캐싱은 별도 plan (V0.5+) — 본 plan 은 FSRS 만으로 동작

---

## 2. 목표

1. **한 화면 진행 대시보드** — 스크롤 없이 핵심 4-5 위젯 보이게
2. **데이터가 보상** — 점수·뱃지·랭크 X. 진행 자체를 시각으로 만족감
3. **빈 상태 친절** — 첫 사용자는 "지금 시작하기" 추천 게임 1개 강조
4. **FSRS 그대로 활용** — 별도 데이터 인프라 0
5. **모바일 우선** — 위젯이 세로 스택, 터치 영역 ≥ 44px

## 3. 비목표

- 다 디바이스 동기화 — V2 풀림 SSO 시점
- 서버 누적 통계 — V0.6+ (이벤트 인프라 plan)
- 친구 랭킹·비교 — 영구 X (PVE 원칙)
- 일별/주별 그래프 — V0.6+
- 알림 (오늘 풀 카드 N장 있어요) — V0.5+ 푸시 인프라 plan

---

## 4. 데이터 모델

### 4.1 추출 가능한 통계 (FSRS state 만으로)

```ts
type DashboardStats = {
  /** 카드를 한 번이라도 본 적 있는 게임 수. */
  gamesPlayed: number;          // /games 디렉토리 중 SRS state 가 1+ 카드 있는 게임
  /** 푼 카드 총 시도 횟수. */
  totalAttempts: number;        // sum over all cards: reps
  /** 정답 횟수. */
  totalCorrect: number;         // totalAttempts - totalLapses
  /** 오답 횟수. */
  totalLapses: number;          // sum over all cards: lapses
  /** 정답률 (0-1). */
  accuracy: number;             // totalCorrect / totalAttempts
  /** 오늘 (자정 ~ 다음 자정) 풀이 횟수. */
  todayAttempts: number;        // lastReview 가 오늘인 카드 수
  /** 곧 만날 카드 수 (due ≤ now + 24h). */
  dueSoonCount: number;
  /** 게임별 분해. */
  perGame: Array<{
    gameId: string;
    title: string;
    cardsTouched: number;       // SRS state 가 있는 카드 수
    cardsTotal: number;         // content 총 카드 수
    attempts: number;
    correct: number;
    accuracy: number;
    lastReview?: Date;          // 가장 최근 lastReview
  }>;
};
```

### 4.2 추출 함수 위치

`src/lib/core/dashboard/stats.ts` 신규 (lib/core 추가).

```ts
export function computeDashboardStats(): DashboardStats;
```

- 모든 게임 manifest 순회 → `loadAllSrsStates(gameId)` → 통계 합산
- 클라이언트 컴포넌트에서 `useEffect` 안 1회 호출 → useState

→ ⚠️ **lib/core 변경**: 단일 파일 추가 (`dashboard/stats.ts`) + barrel export. 다른 게임 영향 0. Plan R §5.4 read-only 계약 준수.

### 4.3 빈 상태 처리

```ts
if (gamesPlayed === 0) {
  // 첫 진입 — 추천 카드 + "지금 시작하기" 강조
  // 콜드 스타트 = factorization 고정
}
```

---

## 5. UX 설계

### 5.1 한 화면 IA (모바일 기준)

```
┌─────────────────────────────────────┐
│ 안녕하세요                          │  ← Hero (간소)
│ N개 게임에서 M장 풀었어요          │  ← 핵심 한 줄
└─────────────────────────────────────┘

┌──────────┬──────────┬──────────┐
│ 진행한    │ 정답률   │ 오늘    │  ← 3-card 행 (KPI)
│  게임    │   M%    │  N장    │
│  N개     │          │         │
└──────────┴──────────┴──────────┘

┌─────────────────────────────────────┐
│ 곧 만날 카드 N장                    │  ← 추천 영역 (오늘 push)
│ ┌─ 카드 추천 ──────────────────┐   │
│ │ 인수분해 블록 분리           │   │
│ │ "어제 풀었던 카드를 다시"    │   │
│ └─────────────────── 시작하기 ┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 게임별 진행                         │  ← 리스트
│ ──────────────────────────────────  │
│ 🎯 인수분해 블록 분리               │
│    5장 중 5장 · 정답률 80%          │
│ ──────────────────────────────────  │
│ ⚡ 수학 빠른 퀴즈                   │
│    5장 중 3장 · 정답률 67%          │
│ ──────────────────────────────────  │
│ ...                                 │
└─────────────────────────────────────┘
```

### 5.2 데스크탑 레이아웃 (lg+)

3개 KPI 카드는 가로, "곧 만날 카드" + "게임별 진행" 은 2-col 그리드.

### 5.3 빈 상태

KPI 카드 자리에 **"지금 시작하기"** 카드 1개 (큼지막)
- "처음이라면 인수분해 블록 분리부터" 카피
- 추천 카드 = factorization 고정 (콜드 스타트)
- "게임별 진행" 영역 = "아직 진행한 게임이 없어요" + "게임 허브 보기" 링크

### 5.4 데이터 부족 빈 상태

KPI 일부만 있는 케이스 (예: 1개 게임만 풀었음):
- KPI 3개 그대로 — 0 표시 안 함, 실제 값
- "게임별 진행" 에는 진행한 게임만 + "더 풀어볼 게임" → /games 링크

### 5.5 톤 & 마이크로카피

- 존댓말 (해요체) 일관
- 외재 보상 어휘 회피: 점수·랭크·뱃지·콤보·승점·1등 등
- 진행 어휘 사용: 풀었어요 / 만날 카드 / 다시 풀기
- 첫 인사: 시간대별 변형 ("좋은 아침이에요" / "오늘 한 번 풀어볼까요" / "오늘도 수고했어요")
  - 시간 분기: 06-11 / 11-18 / 18-24 / 00-06

---

## 6. 위젯 컴포넌트

### 6.1 KPI 카드 (`StatCard`)

| props | type | 설명 |
|---|---|---|
| `label` | string | "진행한 게임" |
| `value` | string \| number | 표시 값 (포맷팅 포함) |
| `helper?` | string | 부가 설명 ("10개 중") |
| `icon?` | LucideIcon | 좌상단 아이콘 |

3개 변형:
1. 진행한 게임 — N개 (헬퍼: 전체 10개 중)
2. 정답률 — M% (헬퍼: N장 푼 중 K장 정답)
3. 오늘 풀이 — N장 (헬퍼: 시작 N분 전)

### 6.2 RecommendationCard (재사용)

기존 [RecommendationCard](../../src/components/RecommendationCard/) 재사용. 빈 상태 (콜드 스타트) 처리는 기존 그대로.

### 6.3 게임별 진행 행 (`GameProgressRow`)

| 영역 | 콘텐츠 |
|---|---|
| 좌 | 게임 아이콘 + 제목 |
| 중 | "5장 중 N장 진행" 또는 "5장 모두 진행" |
| 우 | "정답률 N%" |
| 행 클릭 | `/games/[gameId]` 진입 |

진행도가 100% 인 게임은 jade 강조 (정답률 70% 이상).

### 6.4 빈 상태 카드 (`EmptyDashboard`)

- 큰 일러스트 또는 아이콘 (lucide `Sparkles` 등)
- 카피: "처음 만나는 풀림 게임즈"
- CTA 버튼: "인수분해 블록 분리부터" → `/games/factorization`
- 부 CTA: "전체 게임 보기" → `/games`

---

## 7. 라우트 / 데이터 fetching

### 7.1 SSR vs CSR

대시보드 데이터 = localStorage. **CSR only** — `app/page.tsx` 가 client component.

```tsx
'use client';
export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  useEffect(() => {
    setStats(computeDashboardStats());
  }, []);
  if (!stats) return <DashboardSkeleton />;  // SSR 시 hydration 전
  return <Dashboard stats={stats} />;
}
```

### 7.2 hydration 전략

- 첫 렌더 (SSR/build): skeleton (KPI placeholder + 게임별 행 skeleton)
- 클라이언트 마운트: localStorage 읽기 → setState → 실제 콘텐츠

→ FOUC 회피 위해 skeleton 디자인이 실제 카드와 layout 일치.

### 7.3 새로고침 / focus 동기화

게임 플레이 후 홈으로 돌아오면 통계 갱신되어야 함.
- `visibilitychange` 이벤트 → 다시 `computeDashboardStats()` 호출
- 또는 router event → focus 시 갱신

---

## 8. 구현 범위

### Phase H1 — 데이터 추출 함수 (0.5일)
- [ ] `src/lib/core/dashboard/stats.ts` 신규
  - `computeDashboardStats()` 함수
  - 모든 게임 manifest 순회 → SRS state 합산
- [ ] `src/lib/core/index.ts` barrel 에 export 추가
- [ ] 단위 테스트 (mock localStorage → 통계 검증)

### Phase H2 — 위젯 컴포넌트 (0.5일)
- [ ] `src/components/dashboard/StatCard.tsx`
- [ ] `src/components/dashboard/GameProgressRow.tsx`
- [ ] `src/components/dashboard/EmptyDashboard.tsx`
- [ ] `src/components/dashboard/DashboardSkeleton.tsx`

### Phase H3 — 페이지 통합 (0.5일)
- [ ] `app/page.tsx` 재작성 — 'use client'
- [ ] 시간대별 인사 한 줄 분기
- [ ] visibility 동기화

### Phase H4 — 검증 (0.25일)
- [ ] typecheck / lint / test
- [ ] dev: 빈 상태 + 데이터 있는 상태 모두 확인
- [ ] prod build

**총 소요: 1.75일.**

---

## 9. 검증 기준

- [ ] 빈 상태에서 "지금 시작하기" CTA 노출
- [ ] 1개 게임만 푼 상태에서 KPI 정확 (gamesPlayed=1, accuracy 정확)
- [ ] 모든 게임 풀이 후 "게임별 진행" 10행 모두 노출
- [ ] 게임 플레이 후 홈 복귀 시 통계 갱신 (visibilitychange)
- [ ] 모바일 320px 폭에서 위젯 가독성 유지 (KPI 3-card 가 세로 스택)
- [ ] 데스크탑 1024px+ 에서 2-col 그리드
- [ ] 외재 보상 어휘 0 (점수·랭크·뱃지·콤보 등)
- [ ] typecheck / lint / test / build 통과

---

## 10. NOT in scope

- 서버 누적 통계 (V0.6+ 이벤트 인프라 plan)
- 일별·주별·월별 그래프 (V0.6+)
- 친구 비교 (영구 X)
- 알림 (오늘 풀 카드 N장 있어요) — V0.5+ 푸시 plan
- 다 디바이스 동기화 (V2 SSO)
- 커스텀 게임 통계 — `management.md` 의 사용자 콘텐츠 통계는 별도

---

## 11. 결정 (확정)

1. ✅ **localStorage 기반 단일 디바이스** — V0.5 현실적 범위
2. ✅ **FSRS state 만으로 통계** — 이벤트 인프라 추가 0
3. ✅ **CSR only** — SSR skeleton 후 hydration
4. ✅ **외재 보상 회피** — 점수·랭크·뱃지·콤보 어휘 X, 진행 어휘만
5. ✅ **빈 상태 = factorization 고정 추천** — 콜드 스타트 정책 일관
6. ✅ **시간대별 인사 4분기** — 06/11/18/24

---

## 12. 다음 단계

1. 본 plan 검토
2. APPROVED 시 H1~H4 단계별 구현
3. 후속 검토:
   - `game-hub.md` (게임 허브)
   - `management.md` (관리)
   - V0.5+ 이벤트 인프라 plan (서버 누적 통계)
