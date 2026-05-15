# 2026-05-12 — 게임 변별력 강화 + 시각 polish

- **상태**: ✅ COMPLETE (retroactive 2026-05-13) — Phase 1 (subject badge + english-vocab-typing) PR #23 머지, Phase 2 (factorization strict + 콘텐츠) PR #27·#31 머지, Phase 3 (4 게임 변별력) 별 plan `2026-05-13_game-discrimination-phase3.md` 으로 분리·완료
- **상태**: DRAFT (2026-05-12) — 결정점 3개 합의 필요
- **트리거**: 사용자 피드백 — 게임 5종 변별력 부족, vocab-typing 영어 라인업 부재, 미리보기 과목 뱃지 부재
- **메모리 룰 적용**: 학습효과 > 중독성 / PVE 지향. 변별력 강화는 retrieval 깊이 + 가설 수립 흐름 우선, 시간 압박 회피
- **스코프**: 메커닉 판정 정확도 + 변별력 메커니즘 + 콘텐츠 카테고리 확장 + 시각 카테고리 표시

## 0. 이슈 카테고리화

| ID | 이슈 | 카테고리 | 게임 |
|---|---|---|---|
| I1 | 1:1 trivial 매칭 | 변별력 | english-word-match |
| I2 | drop zone 영역 무관 (distance threshold 만) | 판정 버그 | factorization |
| I3 | 문제 변별력 부족 (식이 너무 trivial) | 콘텐츠 난이도 | factorization |
| I4 | 숫자 +/- 무한 시도, 즉시 결과 노출 | 변별력 | chemistry-balance |
| I5 | 답지 노출 + 끼워맞추기 | 변별력 | math-graph-shift |
| I6 | 답지 노출 + 끼워맞추기 | 변별력 | physics-vector |
| I7 | 국어 외 영어 라인업 부재 | 콘텐츠 카테고리 | vocab-typing |
| I8 | 미리보기 카드 과목 뱃지 부재 (text only) | 시각 polish | 전체 (PreviewView) |

---

## 1. 게임별 진단 + 개선안

### I1 — english-word-match: distractor 추가로 1:1 → N:M

**현재**: card.problem.pairs 만 사용. 좌측 N단어 ↔ 우측 N단어, 모두 1:1 매칭이라 추론 불필요.

**개선**: card 마다 `extras: { english?: string[]; korean?: string[] }` 추가. 우측 옵션 = pairs N + extras M (셔플). 좌측 N단어 매칭 시 클리어. retrieval depth shallow → medium.

**작업**:
- `content.ts` cards 각각에 extras 2~3개 추가 (의미 유사 함정 단어 권장)
- `component.tsx` 의 우측 옵션 생성 시 extras 포함
- 매칭 판정 로직 — extras 와 매칭 시 wrong-flash

### I2 — factorization: drop zone strict hit-test

**현재**: `DRAG_THRESHOLD_PX = 50` — 단순 거리. drop zone 영역 hit 검증 없음.

**개선**: PanInfo 의 final position 이 drop zone bounding rect 안에 있는지 검증. ref + getBoundingClientRect 또는 framer-motion 의 useDragControls + intersection. 영역 안 OR distance > threshold 가 아닌 **영역 안 AND distance > threshold** 로 변경.

**작업**: `DropZone.tsx` ref → bounding rect 노출. `component.tsx` 의 onDragEnd 핸들러에서 hit-test 추가.

### I3 — factorization: 문제 난이도 다양화

**현재**: 카드 예시 `x²-1 → (x+1)(x-1)`. 패턴이 한정적.

**개선**: 콘텐츠 확장 (별 trk).
- 차수 2~3 다양화
- 공통인수 + 차의 제곱 + 합의 제곱 + 그룹 분해
- 함정 후보 (오답 인수) 추가

**작업**: `content.ts` cards 추가. 메커닉 변경 X (별 trk 가능).

### I4 — chemistry-balance: 계수 확정 + 시도 카운트

**현재**: 계수 +/- 실시간 변경, 잘못된 균형은 wrong flash, 맞으면 correct. **무한 시도 가능 + 즉시 결과 노출**.

**개선 옵션**:
- A) "정답 확인" 버튼 명시 → 확정 시점에 판정. 실시간 wrong 표시 제거
- B) 시도 횟수 별점 차감 (3회 초과 = "다시" 등급)
- C) 둘 다

**추천 C** — 학습 흐름 유지하면서 변별력 강화.

**작업**: `component.tsx` 의 wrongCount 카운트 로직 + "정답 확인" 버튼 분기 + correct 자동 진입 → 확정 시 진입.

### I5 — math-graph-shift: 답지 hidden + 가설 수립

**현재**: 목표 식과 함수 그래프 + 변형 슬라이더 노출. 슬라이더 조작하면 즉시 그래프 변형 → "맞으면" 자동 correct.

**개선**: 슬라이더 조작 후 "정답 확인" 클릭 시 판정. 실시간 그래프 비교 X. 또는 목표 그래프 노출 → 사용자가 식의 변형 추측 → 확인.

**작업**: `component.tsx` 의 슬라이더 변경 ↔ correct 판정 분리. "정답 확인" 버튼 추가.

### I6 — physics-vector: 답지 hidden + 가설 수립

**현재**: 두 벡터 합성 결과를 시작 벡터 + 조작으로 맞춤. 조작 즉시 시각 피드백.

**개선**: I5 와 동일 패턴. 합성 결과 노출 → 사용자가 합성 벡터 추측/입력 → 확인.

**작업**: `component.tsx` 의 실시간 비교 → 확정 버튼 도입.

### I7 — vocab-typing 영어 라인업 추가

**현재**: subject = "국어" 단일.

**개선 옵션**:
- A) 신규 게임 `english-vocab-typing` 추가 (manifest + cards + 게임즈 등록)
- B) 기존 vocab-typing 의 cards 안에 영어 subject 도 포함, manifest subject = "영어/국어 통합"
- C) cards 분기로 한 component 안에서 subject 선택

**추천 A** — 게임 라이브러리 카탈로그상 명확. 메모리 룰 "분리된 게임이 아닌 단일 백본 + 다중 게임 모드" 와 호환 (FSRS 등 백본은 공유, manifest 만 분리).

**작업**: `src/games/english-vocab-typing/` 폴더 신규 — manifest + cards + component (vocab-typing 코드 재사용). registry generation 통해 자동 등록.

### I8 — 미리보기 카드 과목 뱃지

**현재**: `<p className="text-helper">{subject} · {unit}</p>` — 텍스트만.

**개선**: subject 별 색상 chip. 위치 — 카드 상단 또는 PreviewMedia 위 overlay. 색상 매핑:

| 과목 | 색상 (Tailwind / 디자인 토큰) |
|---|---|
| 국어 | `bg-pullim-mint-100 text-pullim-mint-700` (또는 디자인 토큰 매핑) |
| 영어 | `bg-pullim-blue-100 text-pullim-blue-700` |
| 수학 | `bg-purple-100 text-purple-700` |
| 과학 | `bg-teal-100 text-teal-700` |
| 사회 | `bg-amber-100 text-amber-700` |
| 내 콘텐츠 | `bg-pullim-slate-100 text-pullim-slate-700` |

**작업**:
- `src/lib/games/subject-badge.ts` — subject → className 매핑 헬퍼
- `PreviewView.tsx` 카드 헤더에 chip 추가. 텍스트 영역에서 subject 제거하고 unit 만 유지
- (선택) GridView, ListView, TableView, ThumbnailView 도 동일 적용

---

## 2. Phase 분할 + 우선순위

### Phase 1 — 시각/콘텐츠 (1~2h, 즉시 효과)

- I8 미리보기 과목 뱃지 (전체 view)
- I7 vocab-typing 영어 라인업 (`english-vocab-typing` 신규)

### Phase 2 — 판정 정확도 (1~2h)

- I2 factorization drop zone strict hit-test
- I3 factorization 콘텐츠 난이도 다양화 (별 trk 가능)

### Phase 3 — 메커닉 변별력 (3~5h, 가장 깊음)

- I1 english-word-match distractor
- I4 chemistry-balance 확정 버튼 + 시도 카운트
- I5 math-graph-shift 답지 hidden + 확인 버튼
- I6 physics-vector 답지 hidden + 확인 버튼

→ Phase 3 의 4 게임 변별력 강화는 큰 작업이라 별 plan 으로 분리 가능. 일단 본 plan 안 Phase 3 로 둠.

---

## 3. 결정점

### D1 — Phase 진행 순서

| 옵션 | 진행 | 장점 |
|---|---|---|
| **A (추천)** | Phase 1 → 2 → 3 순차 | 가벼움 먼저, 즉시 효과. "하나씩 잡아가보자" 사용자 의도 반영 |
| B | Phase 3 (변별력) 먼저 | 학습효과 큰 이슈 우선 해결 |
| C | Phase 1 + 2 동시 (PR 1), Phase 3 별 plan 분리 | 작업 크기 균형 |

### D2 — vocab-typing 영어 라인업 (I7)

| 옵션 | 동작 |
|---|---|
| **A (추천)** | 신규 게임 `english-vocab-typing` (manifest + cards 분리, component 재사용) |
| B | vocab-typing 안 cards 확장 (subject 변경) |
| C | cards 분기 + UI 선택 토글 |

### D3 — 메커닉 변별력 강화 방식 (Phase 3)

| 옵션 | 핵심 |
|---|---|
| **A (추천)** | 답지 hidden + 가설 수립 + "정답 확인" 버튼. retrieval 깊이 강화, 학습 흐름 유지 |
| B | 시간 압박 / 점수 시스템 추가. 변별력 강하지만 학습 흐름과 충돌 위험 |
| C | distractor / 함정 보기 추가. retrieval 강화, 메커닉 변경 작음 |

→ Phase 3 진행 시 A + C 조합 (게임마다 적절히) 권장.

---

## 4. 작업 항목 (D1=A / D2=A / D3=A 채택 가정)

### Phase 1 — 즉시 진행 가능

- [ ] **①** `src/lib/games/subject-badge.ts` 생성 — subject → chip className 매핑
- [ ] **②** `PreviewView.tsx` 카드 헤더에 SubjectBadge 적용, 텍스트에서 subject 제거
- [ ] **③** GridView, ListView, ThumbnailView, TableView 동일 적용 (또는 우선순위 조정)
- [ ] **④** `src/games/english-vocab-typing/` 신규 폴더 — manifest (subject=영어) + cards (영어 단어 10개) + component (vocab-typing 코드 재사용 또는 wrapper)
- [ ] **⑤** registry 재생성 (`bun run gen:registry`) + 14 → 15 게임 확인
- [ ] **⑥** e2e 회귀 — `viewport.spec` 의 OFFICIAL_GAMES 에 english-vocab-typing 추가, e2e 94 → 100 cases

### Phase 2 — Phase 1 OK 후

- [ ] **⑦** `factorization/components/DropZone.tsx` ref + bounding rect 노출
- [ ] **⑧** `factorization/component.tsx` onDragEnd 핸들러에 hit-test 추가
- [ ] **⑨** factorization content.ts 카드 확장 (콘텐츠 난이도 다양화)

### Phase 3 — Phase 2 OK 후 (별 plan 분리 검토)

- [ ] **⑩** english-word-match distractor 추가 (extras + 우측 옵션 확장)
- [ ] **⑪** chemistry-balance 확정 버튼 도입 + 시도 카운트
- [ ] **⑫** math-graph-shift 실시간 비교 → 확인 버튼
- [ ] **⑬** physics-vector 실시간 비교 → 확인 버튼

---

## 5. 비스코프

- 게임 신규 추가 (chemistry-balance Phase B 등)
- FSRS / 추천 알고리즘 변경
- 디자인 시스템 토큰 신규 도입 (subject badge 색상은 기존 토큰 활용)

---

## 6. 합의 후 진행

추천안 A/A/A 그대로면 "추천대로 진행" 한 줄로 OK → Phase 1 부터 코드 작업 시작.
