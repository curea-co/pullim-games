# 게임 라인업 + 필터링 기획서

- **작성일**: 2026-05-08
- **상태**: ✅ COMPLETED (2026-05-08, Phase F1~F5 모두 구현 완료, 결정 대기 5개 모두 권장안 채택 — archive 대상)
- **목적**: V1.5 ~ V3 까지 게임 라인업 정의 + 메인페이지 필터링 UX 설계. 모든 게임이 단일 FSRS 백본 ((B) 아키텍처) 위에서 동작.
- **결론 한 줄**: **10개 게임을 5종 메커닉 × 5과목 매트릭스로 배치하고, 메인페이지 필터는 게임 5개 미만일 때 비활성·6~9개일 때 과목 칩 1축·10개 이상일 때 과목+메커닉 2축으로 단계적 활성화. 상단에 FSRS 기반 "오늘의 추천" 카드 1개 항상 노출.**

---

## 1. 배경

- 현재 게임 1개 (factorization) + 자동 발견 인프라 완비 (병렬 개발 아키텍처 완료)
- 단일 FSRS 백본 위에 다중 모드를 얹는 (B) 아키텍처가 결정됨 (proc/research §6, proc/spec/05 §BR1)
- 게임이 늘면 사용자 선택 비용 증가 → "오늘 뭐 풀까" 결정 마찰 발생
- 풀림 게임즈 핵심 가치 = 학습효과 우선 → 사용자가 헤매면 학습 시간이 깎임

## 2. 목표

1. **V1.5 ~ V3 라인업 명시** — 각 게임의 메커닉/과목/단원/retrieval 깊이/세션 길이/우선순위
2. **메인페이지 필터 UX** — 모바일 우선, 게임 수에 따라 단계적 활성
3. **개인화된 첫 진입** — FSRS 기반 "오늘의 추천" 카드 (콜드 스타트도 자연 처리)
4. **GameMeta 확장 계약** — 필터링에 필요한 메타데이터 추가 (`mechanic`, `retrievalDepth`)
5. **단일 백본 유지** — 모든 게임이 같은 카드 풀·R/S/D·일일 스트릭 공유

## 3. 비목표

- 게임 본격 구현 (각 게임은 별도 PR 단위, 병렬 개발 아키텍처가 받쳐줌)
- 콘텐츠 큐레이션 (각 게임마다 별도 작업)
- AI 자동 메커닉 생성기 (10x 비전, V1 의존성 X)
- 검색 / 별점 / 리뷰 (외재 보상 회피)
- 친구 추천 / 공유 랭킹 (PVE 원칙)

## 4. 분류 축

### 4.1 메커닉 결 (5종)

| 결 | 설명 | retrieval 패턴 | 대표 사례 |
|---|---|---|---|
| **manipulation** (조작) | 풀이 동작이 게임 메커닉. 블록 끌기, 분자 조립 등 | 깊음 (생성형) | factorization |
| **sorting** (정렬) | 순서 맞추기. 시간/논리/문법 어순 | 중간 | history-timeline, english-order |
| **matching** (매칭) | 짝 맞추기. Quizlet match 류 | 얕음 (인식형) | word-pairs |
| **multiple-choice** (객관식) | 빠른 4지선다. 카훗 류 | 얕음 (인식형) | quick-quiz |
| **typing** (타이핑) | 출력형 retrieval. 한자, 어휘 입력 | 중간 (출력형) | vocab-typing |

근거: research §3.4 — 형식 단계화 (객관식 → 매칭 → 타이핑 → 단답) 가 retrieval 깊이를 변형시킴. 같은 카드도 게임에 따라 다른 깊이로 학습됨.

### 4.2 과목 × 단원 (한국 고등학교 전과목 매핑)

| 과목 | V1.5/V2/V3 단원 후보 |
|---|---|
| **수학** | 인수분해, 함수 그래프 변형, 통계 분포 |
| **영어** | 어순(5형식), 수능 어휘, 빈칸 추론 |
| **국어** | 한자/어휘, 문장 구조 |
| **사회** | 한국사 연표, 한국지리 |
| **과학** | 화학 반응식 균형, 물리 벡터 |

### 4.3 retrieval 깊이 (3단계)

- **얕음** (30초~1분) — 인식형, 인지 부하 작음. 자투리 시간 침투용.
- **중간** (1~3분) — 출력 또는 정렬형. 적정 호흡.
- **깊음** (3~5분) — 생성·변형형. 본격 학습 effort.

### 4.4 세션 길이

`30s | 1m | 2m | 3m | 5m`. `estimatedMinutes` 필드는 이미 GameMeta에 있음.

---

## 5. V1.5 ~ V3 게임 라인업 (10개)

| # | id | 제목 | 과목 | 단원 | 메커닉 | 깊이 | 세션 | 우선순위 |
|---|---|---|---|---|---|---|---|---|
| 1 | `factorization` | 인수분해 블록 분리 | 수학 | 고1 다항식 | manipulation | 깊음 | 5m | V1 (활성) |
| 2 | `math-quick-quiz` | 수학 빠른 퀴즈 | 수학 | 전 단원 풀 | multiple-choice | 얕음 | 30s | **V1.5** (검증 후 첫 추가) |
| 3 | `english-order` | 영어 어순 맞추기 | 영어 | 어법·어순 | sorting | 중간 | 2m | **V1.5** |
| 4 | `history-timeline` | 한국사 연표 정렬 | 사회 | 근대사 | sorting | 중간 | 2m | **V2** |
| 5 | `english-word-match` | 영단어 매칭 | 영어 | 수능 어휘 | matching | 얕음 | 1m | **V2** |
| 6 | `chemistry-balance` | 화학 반응식 균형 | 과학 | 화학I | manipulation | 깊음 | 3m | **V2** |
| 7 | `vocab-typing` | 어휘 타이핑 | 국어 | 한자/어휘 | typing | 중간 | 2m | **V2** |
| 8 | `math-graph-shift` | 함수 그래프 변형 | 수학 | 함수 | manipulation | 깊음 | 3m | **V3** |
| 9 | `english-blank` | 영어 빈칸 추론 | 영어 | 수능 빈칸 | multiple-choice | 깊음 | 3m | **V3** |
| 10 | `physics-vector` | 물리 벡터 합성 | 과학 | 물리 | manipulation | 깊음 | 3m | **V3** |

### 분포 의도

- **메커닉 균형:** manipulation 4 / sorting 2 / matching 1 / multiple-choice 2 / typing 1 — 학습 효과 강한 manipulation 우세, 자투리 침투용 얕은 메커닉도 확보
- **과목 균형:** 수학 3 / 영어 3 / 국어 1 / 사회 1 / 과학 2 — 입시 비중 따름. 국어/사회 약함은 V3+ 보완
- **깊이 균형:** 깊음 5 / 중간 3 / 얕음 2 — research §2.1 retrieval practice 대효과 우선
- **V1.5 첫 추가 후보 2개:** `math-quick-quiz` (얕음, 같은 과목 다른 메커닉 검증) + `english-order` (다른 과목, 다른 결 검증). FSRS 백본이 한 과목 내·다과목 모두 작동하는지 같이 검증.

### 게임당 wow 모먼트 (메커닉 결 차별화 핵심)

- **factorization:** 수식이 그 자리에서 변형 (이미 V1 결정)
- **math-quick-quiz:** 30초 안에 5문제 — 수능형 단답 빠른 회상
- **english-order:** 한국어 문장이 위에 떠 있고 영어 단어가 자석처럼 정답 위치에 붙음
- **history-timeline:** 사건 카드가 시간 순으로 배치되면 인과 연결선이 자동으로 그어짐
- **english-word-match:** 의미 짝이 맞으면 두 카드가 결합 애니메이션 (Quizlet match 시각 차용)
- **chemistry-balance:** 분자 수가 균형되는 순간 양변이 "찰칵" 결합
- **vocab-typing:** 한자를 키보드로 입력하면 한자가 손글씨처럼 한 획씩 나타남
- **math-graph-shift:** 그래프를 손가락으로 끌면 식이 실시간 변형 (반비례)
- **english-blank:** 빈칸에 들어갈 단어를 고르면 글의 흐름이 강물처럼 시각화
- **physics-vector:** 두 화살표를 잡으면 합벡터가 평행사변형 그림으로 도출

각 wow 모먼트는 6 핵심 원칙 (학습효과 > 중독성, PVE, 외재보상 최소) 위에서 설계.

---

## 6. GameMeta 확장 계약

기존 GameMeta(SPEC §3.2.1)에 필터링 메타 추가:

```ts
export type GameMechanic =
  | "manipulation"
  | "sorting"
  | "matching"
  | "multiple-choice"
  | "typing";

export type RetrievalDepth = "shallow" | "medium" | "deep";

export interface GameMeta {
  // ── 기존 필드 ──
  id: string;
  title: string;
  subject: string;
  unit: string;
  tagline: string;
  estimatedMinutes: number;
  status: "available" | "coming-soon";
  icon: LucideIcon;
  ogImagePath?: string;

  // ── 신규 (필터링용) ──
  mechanic: GameMechanic;
  retrievalDepth: RetrievalDepth;
}
```

기존 게임 (`factorization`, `coming-soon-demo`)에는 `mechanic: 'manipulation'`, `retrievalDepth: 'deep'` 추가. 마이그레이션 Phase F1 1단계.

---

## 7. 필터링 UX 설계

### 7.1 필터 축 MoSCoW

| 우선순위 | 필터 | 이유 |
|---|---|---|
| **Must** | 과목 (5종) | 학생의 1차 분류 — "오늘은 수학 / 영어 중에 뭐할까" |
| **Must** | 메커닉 결 (5종) | "오늘은 가볍게 / 깊게 풀고 싶다" 결정 |
| **Must** | "오늘의 추천" (FSRS) | 학습효과 우선 원칙 — 시스템이 알면 학생이 안 헤맴 |
| **Should** | 세션 길이 (≤ 2분 / 그 이상) | 자투리 시간 침투 |
| **Could** | 단원 (과목 선택 후) | 깊은 검색 |
| **Won't** | 별점 / 리뷰 / 인기순 | 외재 보상, PVE 원칙 위반 |
| **Won't** | 검색 바 | 게임 10-15개 규모엔 과함 |

### 7.2 게임 수에 따른 단계적 활성화

| 게임 수 | 필터 활성 | 메인페이지 형태 |
|---|---|---|
| 1-5개 | **없음** | 그냥 카드 그리드. 필터 비용이 효익보다 큼. |
| 6-9개 | **과목 칩 1축** | 가로 스크롤 칩 한 줄. "전체 / 수학 / 영어 / ..." |
| 10개+ | **과목 + 메커닉 2축** | 칩 두 줄. 과목 1줄, 메커닉 1줄. |

V1.5(2-3개)에선 필터 없음. V2(7개)부터 과목 칩 활성. V3(10개+)에서 메커닉 칩 추가.

### 7.3 메인페이지 IA (V2 시점)

```
┌──────────────────────────────────────────┐
│ 풀림 게임즈                              │ ← 메타 라벨
│ 푸는 게 곧 배우는 거예요.               │ ← H1
│ 오늘은 어떤 게임으로 시작할까요?        │ ← 부제
│                                          │
│ ┌──────────────────────────────────┐    │
│ │ 오늘의 추천 (FSRS)               │    │ ← 추천 카드 1개 (항상 노출)
│ │ [Variable] 인수분해 블록 분리   │    │
│ │ "어제 풀었던 카드를 다시 만나요" │    │
│ └──────────────────────────────────┘    │
│                                          │
│ [전체] [수학] [영어] [국어] [사회] [과학] ← 과목 칩 (V2부터)
│                                          │
│ 플레이할 수 있는 게임 (7개)              │
│ ┌────────────┐ ┌────────────┐           │
│ │  게임 카드 │ │  게임 카드 │           │
│ │            │ │            │           │
│ └────────────┘ └────────────┘           │
│  ...                                     │
│                                          │
│ 곧 만나요 (3개)                          │
│ ...                                      │
│                                          │
│ ┌──────────────────────────────────┐    │
│ │ 학습 데이터 — 어떤 게임이든 ...  │    │ ← InfoNote
│ └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

V3 시점에 메커닉 칩 한 줄이 과목 칩 아래에 추가.

### 7.4 필터 칩 UX 디테일

- **가로 스크롤 (overflow-x-auto)** — 모바일에서 5개 이상이면 자동 스크롤. 데스크톱은 한 줄에 다 표시.
- **터치 영역 ≥ 44px** (SPEC §08.10) — `px-4 py-2`로 칩 자체가 충분
- **선택 시각:** 비선택 = `border + bg-bg-block`, 선택 = `bg-accent-positive/10 + border-type-primary`. **글자색은 항상 type-primary** (jade는 글자 금지)
- **"전체"가 디폴트.** URL 쿼리 파라미터 동기화 (`?subject=math`) — 공유/브라우저 백버튼 작동
- **다중 선택 X (V2까지)** — 복잡도 증가. 단일 선택만. V3에서 재검토.
- **빈 결과 처리:** "이 조합으로는 게임이 없어요" + "전체 보기" 버튼

### 7.5 모바일 절제 원칙

- 필터 칩은 항상 1줄(또는 2줄). 그 이상이면 게임이 너무 많음 → 게임 수 자체를 재검토
- 필터 패널/모달 X — 인라인 칩만
- 정렬 옵션 X — "오늘의 추천 + 그리드"로 충분
- 검색 바 X — 10-15개 규모엔 카드를 보고 고르는 게 더 빠름

---

## 8. "오늘의 추천" 카드 (FSRS 기반)

### 8.1 추천 결정 로직

입력: 사용자 fingerprint, FSRS CardState 전체

알고리즘 (의사코드):

```
1. 사용자 카드 풀에서 R(retrievability) 계산
2. R 가장 낮은 (가장 잊기 직전인) 카드 N장 추출
3. 그 카드들의 unit/subject 분석 → 가장 빈번한 unit 선택
4. 그 unit을 다루는 게임 중에서:
   - status='available' 우선
   - 사용자가 안 풀어본 게임이 있으면 그것 우선 (다양성)
   - 같은 게임이면 그 게임 추천
5. 추천 이유 카피:
   - "어제 풀었던 카드를 다시 만나요" (1주 내)
   - "이 단원이 잊기 직전이에요" (1주+)
   - "처음이라면 인수분해부터" (콜드 스타트)
```

### 8.2 콜드 스타트 (처음 진입)

CardState 0개 → "처음 만나는 풀림 게임즈" 라벨 + V1 첫 게임 (factorization) 추천.

V2부터는 "처음이라면 — 인수분해 블록 분리" 고정 또는 "오늘의 인기" 같은 fallback (단, 인기는 외재 보상 함의 있음 → 자제).

권장: **콜드 스타트 = 항상 factorization 고정.** 첫 사용자에겐 가장 검증된 wow 모먼트를 보여줌.

### 8.3 추천 카드 시각

- 일반 게임 카드보다 약간 큼 (메인페이지 상단 단일 카드)
- "오늘의 추천" 라벨 (uppercase tracking-wider, type-secondary)
- 카드 안에 "추천 이유" 한 줄 (예: "어제 풀었던 카드를 다시 만나요")
- 본 카드와 디자인 일관성 유지 — 폭죽/별표 X

### 8.4 추천 거절 처리

사용자가 추천 카드 무시하고 다른 게임 선택해도 패널티 X. 다음 진입 시 추천 다시 계산. "왜 이걸 추천했는지" 작은 ⓘ 아이콘으로 explanation 제공 (옵션, V3).

---

## 9. 마이그레이션 플랜

### Phase F1 — GameMeta 확장 + 기존 게임 보강 (0.5일) ✅

- [x] `src/lib/games/types.ts` 에 `mechanic`, `retrievalDepth` 필드 추가
- [x] 기존 게임 manifest 에 신규 필드 추가
- [x] `npm run gen:registry` + typecheck 통과

### Phase F2 — V1.5 두 번째·세 번째 게임 추가 (1일) ✅

- [x] `math-quick-quiz` manifest + 본격 구현 (status='available', 4지선다)
- [x] `english-order` manifest + 본격 구현 (sorting, click-to-fill)
- [x] V1.5 → V2/V3 stub 7개 추가 → 본격 구현까지 완료 (V2 4개 + V3 3개)
- [x] 메인페이지 카드 10개 표시

### Phase F3 — 필터 UX (V2 진입 시점, 게임 6개+) (1.5일) ✅

- [x] [src/components/FilterChips/](../../src/components/FilterChips/) 새 컴포넌트 (가로 스크롤 칩)
- [x] URL 쿼리 파라미터 동기화 (`useSearchParams`)
- [x] 메인페이지 게임 그리드를 필터링된 결과로 렌더
- [x] 빈 결과 UI + "전체 보기" fallback ("이 조합으로는 게임이 없어요")

### Phase F4 — "오늘의 추천" 카드 (FSRS 통합 후) (1일) ✅

- [x] FSRS 통합 (Phase 1 본 작업)
- [x] [src/lib/core/recommendation/today.ts](../../src/lib/core/recommendation/today.ts) 추천 알고리즘
- [x] 메인페이지 상단에 [RecommendationCard](../../src/components/RecommendationCard/) 1개 항상 렌더 (콜드 스타트 = factorization 고정)

### Phase F5 — V3 메커닉 축 추가 (게임 10개+ 시점) (0.5일) ✅

- [x] FilterChips 두 줄 모드 자동 활성화 (게임 수 ≥ FILTER_THRESHOLD_MECHANIC=10 임계)
- [x] 메커닉 칩 ("전체 / 조작 / 정렬 / 매칭 / 객관식 / 타이핑") — `MECHANIC_OPTIONS` 정의됨
- [x] 두 축 AND 필터링 (예: 수학 + 조작) — `applyFilter(games, { subject, mechanic })`

**실제 소요: 1일 (AI 가속, V1.5/V2/V3 모두 같은 날 본격 구현 완료).**

---

## 10. NOT in scope

- 다중 선택 필터 (V3 재검토)
- 별점 / 리뷰 / 인기순 정렬 (외재 보상 회피)
- 검색 바 (10-15개 규모엔 과함, V4+ 시 재검토)
- 게임 카테고리 / 태그 / 자유 분류 (과목·메커닉 2축으로 충분)
- 콘텐츠 큐레이션 (각 게임 별도 작업)
- 학년별 필터 (고1/고2/고3) — V3 재검토
- 친구 추천 / 공유 랭킹 (PVE 원칙)
- AI 자동 추천 외 다른 추천 방식 (별도 시스템 도입은 lib/core 변경)

---

## 11. 결정 대기 항목 ✅ 5/5 모두 권장안 채택

1. ✅ **게임 라인업 10개 우선순위 동의** — V1.5 (math-quick-quiz + english-order) → V2 (history-timeline, english-word-match, chemistry-balance, vocab-typing) → V3 (math-graph-shift, english-blank, physics-vector) 순서 그대로 진행.
2. ✅ **필터 칩 활성 임계** — 1-5 비활성 / 6-9 과목 1축 / 10+ 과목+메커닉 2축. [src/lib/games/filter.ts:10-11](../../src/lib/games/filter.ts) 임계 상수.
3. ✅ **콜드 스타트 추천 정책** — 항상 `factorization` 고정. [src/lib/core/recommendation/today.ts](../../src/lib/core/recommendation/today.ts) 구현됨.
4. ✅ **추천 카드의 시각 강도** — 일반 카드보다 약간 큼 + 라벨만 ("오늘의 추천"). 강한 강조 회피.
5. ✅ **다중 선택 필터** — V2까지 단일 선택만 채택 (V3+ 재검토).

---

## 12. SPEC 반영 (승인 후 작업)

- **proc/spec/03 §3.1 MoSCoW** — 신규 게임 9종 status 표 갱신
- **proc/spec/03 §3.4 Screen Spec** — 메인페이지에 추천 카드 + 필터 칩 영역 추가
- **proc/spec/04 §4.3 Navigation Flow** — 필터 적용 시 URL 변화 (`/?subject=math`)
- **proc/spec/06 §6.1** — V1.5 / V2 / V3 카드 콘텐츠 후보 (각 게임 5장 카드 단원 명시)
- **proc/spec/08 §8** — 필터 칩 디자인 토큰 (선택/비선택 상태)
- **proc/spec/10 Phase F1~F5** — 로드맵에 추가

---

## 13. 다음 단계 ✅ 종료

1. ✅ 이 기획서 검토 + 결정 대기 5개 항목 확정 (모두 권장안 채택)
2. ✅ Phase F1~F5 모두 완료
3. ⏭️ SPEC §12 5개 문서 갱신은 콘텐츠 큐레이션 시점에 (V2/V3 카드 5장씩 SPEC §6.1 반영)

---

## 완료 메모 (2026-05-08)

- 10/10 게임 매트릭스 (5종 메커닉 × 5과목) 모두 활성
- 메인페이지: "오늘의 추천" 카드 + 과목 칩 (5종) + 메커닉 칩 (6종 = 전체 + 5종) + 활성 게임 그리드
- FSRS 단일 백본 위에 다중 게임 모드가 모두 작동
- 본 기획서는 `proc/archive/plan/` 으로 이동 — 향후 V4+ 라인업 추가 시 임계 (FILTER_THRESHOLD_*) 와 단계적 활성 정책 참조
