# V2/V3 신규 7개 게임 상세 설계 기획서

- **작성일**: 2026-05-08
- **상태**: DRAFT (검토 후 SPEC 03/06 + 각 게임 V2/V3 본격 구현 PR 시 참조)
- **목적**: V1.5 까지 활성된 3개 게임에 더해 V2/V3 라인업 7개를 stub manifest 로 추가하고, 각 게임의 wow 모먼트·카드 풀 sample·본격 구현 시 작업 범위를 한 문서로 정리한다.
- **결론 한 줄**: **10개 게임 = 5종 메커닉 × 5과목 매트릭스를 채웠다. V2 4개 (history-timeline, english-word-match, chemistry-balance, vocab-typing) → V3 3개 (math-graph-shift, english-blank, physics-vector) 순서로 본격 구현. 각 게임의 wow 모먼트는 메커닉 결이 같아도 시각 차별화로 분리한다.**

---

## 1. 배경 및 현재 상태

### 1.1 현재 라인업 (2026-05-08 시점)

- 활성 (`status: 'available'`): 3개
  - `factorization` (수학 / 인수분해 / manipulation / deep / 5m) — V1
  - `math-quick-quiz` (수학 / 전 단원 / multiple-choice / shallow / 30s) — V1.5
  - `english-order` (영어 / 어법 / sorting / medium / 2m) — V1.5
- coming-soon: 7개 (이번 stub 추가)

### 1.2 stub 추가의 의미

7개 게임의 manifest + schema + content (빈) + placeholder component + README 가 `src/games/<id>/` 에 들어갔다. 이로써:

1. **메인페이지에 10개 카드 노출** — 활성 3 + 곧 만나요 7
2. **필터 2축 자동 활성** — 게임 수 ≥ 10 임계 (Plan F §7.2) 도달, `FILTER_THRESHOLD_MECHANIC = 10` 트리거
3. **V2/V3 작업자 onboarding** — 디렉토리·README·schema 가 미리 깔려 있어 본격 구현 PR이 좁은 범위로 들어옴
4. **registry 자동 발견** — `npm run gen:registry` 가 alphabetical 으로 10개 import

### 1.3 비목표

- 7개 게임 본격 구현 (각각 별도 PR — 본 문서는 설계 명세, 구현 명령서가 아님)
- 콘텐츠 큐레이션 (각 게임 README §콘텐츠 후보 5장 sample 까지)
- V2/V3 로드맵 일정 확정 (Phase F2~F5 시점은 SPEC §10 결정 사항)

---

## 2. 7개 게임 상세 설계

각 게임은 README 에 기본 정보가 있고, 본 §2 는 **메커닉 결 차별화 + 본격 구현 시 핵심 결정** 에 집중한다.

### 2.1 history-timeline (사회 / 근대사 / sorting / medium / 2m / V2)

**핵심 명제**: 사건 카드 5개를 시간 순으로 슬롯에 놓으면 인과 연결선이 자동으로 그어진다.

**english-order 와의 sorting 결 차별화**:
- english-order: 단어 토큰을 슬롯에 끼워 영어 어순 만들기 — **공간(좌→우 어순)** 정렬
- history-timeline: 사건 카드를 시간 축에 놓기 — **시간(과거→현재)** 정렬, 추가로 인과 연결선 SVG

본격 구현 시 핵심 결정:
- 인과 연결선을 정답 시 자동 그릴지, 학생이 직접 그릴지 → **자동** (학습 효과 우선, 부담 최소)
- 사건 카드 표시 정보 → 사건명 + 연도 (학생이 연도 보고 정렬할 수 있게). 연도 가림 모드는 V3+
- 시간 축 시각 — 가로 (모바일에서는 세로 검토)

### 2.2 english-word-match (영어 / 수능 어휘 / matching / shallow / 1m / V2)

**핵심 명제**: 영단어 5개 + 한국어 의미 5개 무작위 배치, 짝 맞추면 두 카드 결합.

**math-quick-quiz 와의 shallow retrieval 결 차별화**:
- math-quick-quiz: 4지선다 — **인식·선택**
- english-word-match: 짝 맞추기 — **인식·짝짓기**, 결합 애니메이션이 wow 모먼트

본격 구현 시 핵심 결정:
- 매칭 인터랙션 패턴 → **2-탭 선택** (첫 탭: highlight, 둘째 탭: 매칭 시도). 드래그는 V3+
- 셔플 — deterministic seed 로 테스트 안정성 확보 (english-order 패턴 차용)
- 같은 카드 풀 다회차 노출 시 셔플 시드 변경 (FSRS 와 무관, UI 변동성)

### 2.3 chemistry-balance (과학 / 화학I / manipulation / deep / 3m / V2)

**핵심 명제**: 좌변·우변 분자 앞 계수를 +/- 조작, 양변 원자 수 균형되면 반응식 결합.

**factorization·math-graph-shift·physics-vector 와의 manipulation 결 차별화**:
- factorization: 다항식 항 블록 — **수식 변형**
- math-graph-shift: 함수 그래프 — **시각·식 동기화**
- chemistry-balance: 분자 + 계수 — **이산값 조정**
- physics-vector: 화살표 + 좌표 — **연속 공간 벡터**

각자 시각 패러다임이 달라 같은 manipulation 결이지만 wow 모먼트 시각이 모두 다르다.

본격 구현 시 핵심 결정:
- 계수 입력 — +/- 버튼 vs 숫자 입력 → **+/- 버튼** (모바일 친화, 1~10 범위)
- 양변 원자 수 카운터 — 항상 표시 vs 균형 시만 → **항상 표시** (학생이 균형 추적해야 학습됨)
- 화학식 표기 — 첨자 (HTML `<sub>`) vs 평문 → V2 시작은 평문 (`H2O`), V3+ 첨자

### 2.4 vocab-typing (국어 / 한자·어휘 / typing / medium / 2m / V2)

**핵심 명제**: 뜻풀이 표시, 학생이 정답 어휘 타이핑, 입력한 글자가 손글씨처럼 한 획씩 나타남.

**4종 retrieval 결과 비교**:
- multiple-choice: 인식
- matching: 인식 + 짝짓기
- sorting: 출력 (순서 생성)
- typing: **출력 (자유 생성)** — 가장 깊음 (객관식 보기 X)
- manipulation: 출력 + 변형

V2 라인업에서 typing 결을 vocab-typing 으로 채워 모든 메커닉 결을 한 번씩 검증.

본격 구현 시 핵심 결정:
- 입력 도메인 — 한글 vs 한자 → **V2 한글 음 입력**, V3+ 한자 직접 입력 검토 (모바일 IME 부담)
- 정답 판정 — strict 일치 vs 동의어 허용 → **strict**, 힌트 버튼으로 보조
- 손글씨 stroke 애니메이션 — V2 1차 letter-fade, V3 한 획씩 stroke (SVG path 데이터 필요)

### 2.5 math-graph-shift (수학 / 함수 / manipulation / deep / 3m / V3)

**핵심 명제**: 좌표평면 그래프를 손가락으로 끌면 함수식이 실시간으로 변형. 목표 그래프 윤곽으로 끌면 정답.

**factorization 와의 수학 manipulation 결 차별화**:
- factorization: 다항식 항 블록 — **이산 토큰 조작**
- math-graph-shift: 그래프 곡선 — **연속 시각·식 동기화**

수학 카테고리 안에서도 manipulation 결이 두 개. 시각 패러다임 자체가 달라 학생이 헷갈리지 않음.

본격 구현 시 핵심 결정:
- 변형 종류 — 평행이동 / 확대 / 반사 → **셋 다 지원**, 단 카드별 1~2개로 제한 (난이도 조절)
- 정밀도 — 픽셀 단위 vs snap → **0.5 단위 snap** (모바일 터치 정확도 한계)
- 식 평가 엔진 — mathjs 활용 (이미 의존성 있음, factorization 과 같은 lib)

### 2.6 english-blank (영어 / 수능 빈칸 / multiple-choice / deep / 3m / V3)

**핵심 명제**: 짧은 본문 + 빈칸, 4지선다. 정답 시 본문 흐름이 강물처럼 시각화.

**math-quick-quiz 와의 multiple-choice 결 차별화**:
- math-quick-quiz: shallow / 30초 / 단답 — **인식**
- english-blank: deep / 3분 / 본문 추론 — **추론·맥락**

같은 multiple-choice 결인데 retrieval 깊이가 다르다 (shallow vs deep). 같은 메커닉이라도 콘텐츠 형식이 깊이를 결정한다는 research §3.4 사례.

본격 구현 시 핵심 결정:
- 본문 길이 — 80~120 단어 (수능 빈칸 표준 1단락)
- 본문 출처 — 자체 paraphrase (저작권). EBS 학습용 수정·번안
- 흐름 시각화 — 정답 keyword 간 SVG path animation, 220ms 이내 (proc/spec/08 §8.6)
- 오답 시 rationale — 한 줄 해설로 학습 보완 (객관식이라 retrieval 자체는 약함, 해설로 보강)

### 2.7 physics-vector (과학 / 물리I / manipulation / deep / 3m / V3)

**핵심 명제**: 두 화살표를 잡아 끌면 평행사변형 보조선 + 합벡터 도출.

**chemistry-balance 와의 과학 manipulation 결 차별화**:
- chemistry-balance: 분자 + 계수 — **이산 조정**
- physics-vector: 화살표 + 좌표 — **연속 공간 조작**

과학 카테고리 안에서 retrieval 깊이도 둘 다 deep, 메커닉도 manipulation. 차별점은 **공간 차원** (1D 계수 vs 2D 벡터).

본격 구현 시 핵심 결정:
- 합성 방법 — 평행사변형 vs 머리-꼬리 → **둘 다 토글** (V3 후반)
- 단위 표시 — 크기만 (예: "5N") vs 정식 SI → V3 시작은 크기, V4+ 정식
- 분해 (역방향) — V3 시작은 합성만, V3 후반 검토

---

## 3. 메커닉 결 × 시각 패러다임 매트릭스

| 결 | 게임 | 시각 패러다임 | retrieval 깊이 |
|---|---|---|---|
| manipulation | factorization | 다항식 항 블록 (이산 토큰) | deep |
| manipulation | chemistry-balance | 분자 + 계수 (이산값) | deep |
| manipulation | math-graph-shift | 좌표평면 그래프 (연속 시각·식) | deep |
| manipulation | physics-vector | 좌표평면 화살표 (연속 2D) | deep |
| sorting | english-order | 단어 어순 (좌→우 공간) | medium |
| sorting | history-timeline | 사건 시간축 (과거→현재) | medium |
| matching | english-word-match | 카드 짝짓기 | shallow |
| multiple-choice | math-quick-quiz | 4지선다 단답 | shallow |
| multiple-choice | english-blank | 4지선다 본문 추론 | deep |
| typing | vocab-typing | 키보드 입력 → 글자 stroke | medium |

**관찰**: manipulation 4개가 모두 deep — 의도된 분포. 학습 효과 우선 원칙 (메모리 `feedback_design_priorities.md`) 따름.

---

## 4. 본격 구현 시 공통 패턴

7개 게임 모두 본격 구현 시 다음 패턴을 따른다 (V1.5 활성 게임 3개에서 검증된 것):

### 4.1 디렉토리 골격

```
src/games/<id>/
  manifest.ts          # 이미 stub 있음 (status='coming-soon' → 'available' 변경)
  schema.ts            # 이미 stub 있음 (필드 보강)
  component.tsx        # placeholder 교체 — 5-phase 상태 머신 패턴 권장 (factorization/math-quick-quiz 차용)
  components/          # 게임 전용 sub-component (필요 시)
  logic/               # 순수함수 — 정답 판정, 변형 등 (필요 시)
    *.test.ts          # 게임 단위 테스트
  content/index.ts     # 5장 카드 (README §콘텐츠 후보 참조)
```

### 4.2 5-phase 상태 머신

factorization/math-quick-quiz/english-order 가 이미 사용 중. 일관 UX:

1. `idle` — 시작 화면, "시작하기" 버튼
2. `playing` — 카드 현재 풀이 중
3. `correct` — 정답 시 시각 피드백 (220ms spring)
4. `incorrect` — 오답 시 shake + 정답 표시
5. `complete` — 5문제 끝, 결과 화면

### 4.3 FSRS 통합

```ts
import { reviewCard, createInitialState, getRetrievability } from "@/lib/core";
import { saveSrsState, loadSrsState } from "@/lib/core";
```

- 카드별 FSRS state 저장: key `pullim-games:srs:<gameId>:<cardId>`
- Rating: Easy / Good / Hard / Again 매핑은 게임마다 결정 (정답 시 Good, 오답 시 Again 기본)

### 4.4 이벤트 로깅

```ts
import { logEvent } from "@/lib/core";
logEvent({ type: "card-attempt", gameId, cardId, correct, durationMs });
```

`/api/event` 로 fire-and-forget. 본격 구현 시 게임별 추가 이벤트 정의 가능 (manipulation 게임은 변형 단계별 이벤트 등).

### 4.5 시각 톤

- 정답: jade `#00D4A1` glow + 220ms spring (proc/spec/08 §8.6)
- 오답: 빨강 + 32px shake
- 폭죽 / 별표 / 가챠 X (외재 보상 회피)
- 한국어: 존댓말 (해요체)

---

## 5. 카드 콘텐츠 작업 가이드 (V2/V3 작업자용)

### 5.1 카드 5장 우선 구성

각 게임 README §콘텐츠 후보에 5장 후보가 있다. 본격 구현 시:

1. **난이도 1~5 분포** — 카드 1장 = 난이도 1, 5장 = 난이도 5 단조 증가
2. **단원 일관성** — 한 게임 내 5장은 같은 단원 (예: chemistry-balance 5장 모두 화학I 반응식)
3. **schema validate** — `<ID>CardSchema.parse(card)` 으로 zod 검증 통과 강제

### 5.2 외부 저작권 회피

- english-blank, vocab-typing, history-timeline 등 — 교과서·EBS 직접 인용 금지
- 자체 paraphrase 또는 학습용 변형
- 인용 의심 시 외부 검토자 (PM 또는 도메인 전문가) 확인

### 5.3 메타데이터 일관성

```ts
{
  id: "<gameId>-<unit>-<seq>",  // 예: "chemistry-balance-redox-001"
  difficulty: 1,                 // 1-5
  unit: "<단원>",                 // 게임 manifest unit 과 일치
  // 게임별 problem 필드 (schema 따름)
}
```

---

## 6. 우선순위와 시점

### 6.1 V2 4개 (4주~8주)

순서 권장:
1. **history-timeline** 먼저 — sorting 결 검증 (english-order 외 두 번째 sorting 게임), 사회 카테고리 첫 진입
2. **english-word-match** — matching 결 첫 진입, 어휘 데이터로 다른 영어 게임과 카드 풀 연결 검증
3. **chemistry-balance** — 과학 카테고리 첫 진입, manipulation 결 두 번째 게임
4. **vocab-typing** — typing 결 검증 (모든 5종 메커닉 결 활성화), 국어 카테고리 첫 진입

V2 완료 시점에 **5종 메커닉 × 5 과목 매트릭스 모두 활성화**.

### 6.2 V3 3개 (8주~12주)

V3 는 모두 deep retrieval — 학습 효과 우선:
1. **math-graph-shift** — 수학 두 번째 manipulation, 시각 패러다임 차별화 검증
2. **english-blank** — 영어 deep retrieval (수능 빈칸), 같은 multiple-choice 결의 깊이 검증
3. **physics-vector** — 과학 두 번째 manipulation, 2D 좌표 인터랙션 검증

### 6.3 V2 → V3 게이트 체크

V2 4개 출시 후, V3 진입 전 검증:
- [ ] FSRS 단일 백본이 5 메커닉 × 5 과목 모두 작동
- [ ] 필터 2축 (과목 + 메커닉) UX 모바일에서 부담 X (사용자 5명 인터뷰)
- [ ] 학생당 평균 게임 다양성 — 한 학생이 2개 이상 게임 사용 비율 ≥ 50%
- [ ] 학습 데이터 — 같은 카드를 다른 게임에서 만나는 경험 검증 (단일 백본 효과 실증)

---

## 7. 변경 영향 분석

### 7.1 메인페이지 (자동 적응)

이미 [src/app/page.tsx](../../src/app/page.tsx) 가:
- `totalGameCount = games.length` (10)
- `subjectFilterActive = totalGameCount >= 6` → `true`
- `mechanicFilterActive = totalGameCount >= 10` → `true`

→ 메인페이지에 **과목 칩 + 메커닉 칩 두 줄 자동 활성화**. 코드 변경 0.

### 7.2 게임 라우트

`/games/<id>/` — `coming-soon` 7개는 `notFound()` 처리. 메인페이지 카드는 `<Lock>` 아이콘 표시.

### 7.3 추천 카드 (FSRS)

[src/lib/core/recommendation/today.ts](../../src/lib/core/recommendation/today.ts) — `available` 게임 중에서만 추천. `coming-soon` 7개 영향 없음. 콜드 스타트 기본값 `factorization` 유지.

### 7.4 lib/core 변경 0

이번 stub 추가는 `src/games/<id>/` 디렉토리 7개만 신규. lib/core 수정 0건. **병렬 개발 아키텍처 §11 검증 기준 #1 (중앙 파일 수정 0개) 실증.**

---

## 8. 검증 기준 (이번 stub 추가 완료 시)

- [x] `npm run gen:registry` 가 10개 게임을 alphabetical 발견
- [x] typecheck 통과 (모든 manifest 가 `GameManifest` 타입 만족)
- [x] lint 통과 (no-restricted-imports 규칙 위반 0)
- [x] test 70/70 통과 (lib/core 단위 테스트 + factorization 게임 테스트, 신규 게임은 빈 content 라 테스트 없음)
- [x] 메인페이지 코드 변경 없이 10개 카드 노출 + 필터 2축 자동 활성
- [x] coming-soon 7개 라우트는 404, 메인페이지 카드는 잠금 아이콘
- [ ] V2 첫 게임 본격 구현 시 lib/core 수정 0 (Plan R 검증 기준 재실증, V2 작업 시 확인)

---

## 9. NOT in scope

- V2/V3 본격 구현 (각 게임 별도 PR)
- 메인페이지 UI 변경 (필터 2축은 이미 활성됨, 추가 수정 불필요)
- FSRS 추천 알고리즘 변경
- 외부 콘텐츠 라이선싱 (자체 paraphrase 원칙)
- 게임 11번째 라인업 (10개로 균형 매트릭스 완성, 11+ 는 V4 검토)

---

## 10. 결정 대기 항목

이 기획서를 SPEC 에 반영하기 전 확정해야 할 항목:

1. **V2 출시 게임 4개 순서?** §6.1 권장: history-timeline → english-word-match → chemistry-balance → vocab-typing. 다른 순서 가능.
2. **V3 출시 게임 3개 순서?** §6.2 권장: math-graph-shift → english-blank → physics-vector.
3. **외부 콘텐츠 출처 정책?** 권장: 자체 paraphrase 만, EBS·교과서 직접 인용 금지. 법무 검토 필요할 수 있음.
4. **카드 5장 → V2/V3 본격 구현 시 충분한가?** 권장: V1 factorization 5장으로 시작했음, 5장으로 출시 후 사용자 피드백 따라 확장.
5. **manipulation 4개 시각 차별화 충분한가?** §3 매트릭스로 차별 명확. 디자인 리뷰 필요할 수 있음.

---

## 11. 다음 단계

1. 이 기획서 검토
2. 결정 대기 5개 항목 확정
3. SPEC `06-콘텐츠-데이터.md` `§6.1` 에 V2/V3 7개 게임 카드 후보 5장씩 추가
4. SPEC `10-개발-로드맵.md` 에 V2 4개 / V3 3개 phase 명시
5. V2 첫 게임 (권장: history-timeline) 본격 구현 PR 진입
