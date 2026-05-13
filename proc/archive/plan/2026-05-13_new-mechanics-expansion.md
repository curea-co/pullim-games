# 2026-05-13 — 신규 메커닉 3종 추가 (라인업 확장)

- **상태**: ✅ MERGED (2026-05-13) — M1 PR #32, M2 PR #33, M3 PR #34 모두 main 머지 완료 (commit 358abf0 / efd1ffa / 301fb01). main 기준 자가 검증 통과.
- **트리거**: 사용자 요청 — "게임 몇 개 더 만들어볼까" → 콘텐츠 조합이 아닌 **새 메커닉** 방향 확정
- **메모리 룰 적용**:
  - 학습효과 > 중독성, PVE 지향 → retrieval depth + 가설 수립 흐름 우선
  - 하이퍼캐주얼 유지 (RPG 확장 금지) → 메커닉 1개 = 인터랙션 1개, 5분 이내 완결
  - 단일 백본 + 다중 게임 모드 → 신규 메커닉도 FSRS/스트릭/registry 공유, manifest 만 분리
  - 답지 노출 + 끼워맞추기 회피 → 확정 버튼 패턴 적용

## 0. 현재 메커닉 분포 (15게임)

| GameMechanic | 게임 | 결 |
|---|---|---|
| manipulation | factorization, math-graph-shift, physics-vector, chemistry-balance | 드래그·슬라이더로 식/벡터 변형 |
| sorting | history-timeline, english-order | 순서 맞추기 |
| matching | english-word-match, custom-word-match | 짝 짓기 |
| multiple-choice | math-quick-quiz, english-blank, custom-blank, custom-multiple-choice | 4지선다·빈칸 |
| typing | english-vocab-typing, vocab-typing, custom-typing | 출력형 retrieval |

→ 메커닉은 5종으로 충분히 분포. **새 메커닉을 추가**하지 않고 신규 게임을 만들 수도 있지만, 사용자 의도는 "인터랙션 패턴이 새로운" 게임. 따라서 기존 5종과 결이 다른 인터랙션 3종을 후보로 둠.

## 1. 후보 메커닉 3종

### M1 — 펀넷 사각형 (생명과학 유전)

- **gameId**: `genetics-punnett`
- **과목 · 단원**: 생명과학 / 유전 (멘델 / 독립의 법칙 / 두 쌍 교배)
- **인터랙션**: 부모 유전자 칸(좌·상)에 대립유전자 카드를 드래그 배치 → 4×4 또는 2×2 격자가 자동으로 자손 유전자형 채움 → 우측 입력란에 **표현형 비율** (예: `9:3:3:1`) 입력 → "정답 확인" 클릭
- **새 GameMechanic 후보**: `grid-fill` (manipulation 의 격자 변종으로도 분류 가능 — D1 결정)
- **retrieval depth**: medium~deep — 자손 유전자형은 자동 계산되지만 **표현형 비율은 우성/열성 판정 추론 필요**
- **변별 포인트**: 답지 노출 없음 — 비율 입력 후 확인. 끼워맞추기 어려움 (입력형).
- **schema 스케치**:
  ```ts
  problem: {
    parents: { p1: string[]; p2: string[] };  // ex: p1=["A","a"], p2=["A","a"]
    traits: Array<{ symbol: string; dominant: string; recessive: string; phenotype: { dominant: string; recessive: string } }>;
    expectedRatio: number[];  // ex: [9, 3, 3, 1] 또는 [3, 1]
  }
  ```
- **콘텐츠 분량 V0**: 5장 (1쌍 단성 → 2쌍 양성 → 불완전우성 → 치사유전 → ABO혈액형)

### M2 — 품사 태깅 (국어 문법)

- **gameId**: `korean-pos-tagging`
- **과목 · 단원**: 국어 / 문법 (9품사 — 명사·대명사·수사·동사·형용사·관형사·부사·조사·감탄사)
- **인터랙션**: 한 문장이 어절 단위로 표시 → 어절 탭 → 품사 팔레트(하단)에서 색 선택 → 어절이 해당 색으로 칠해짐 → 모든 어절 태깅 완료 시 "정답 확인" 활성화
- **새 GameMechanic 후보**: `tagging` (multiple-choice 의 in-line 변종) — D1 결정
- **retrieval depth**: medium — 9품사 판별은 문맥 + 형태 분석. 직접 retrieval
- **변별 포인트**: 어절마다 답이 분리되어 있어 부분 정답률로 등급화 가능. "정답 확인" 전 색 변경 자유.
- **schema 스케치**:
  ```ts
  problem: {
    sentence: string;  // 표시용 (디버그)
    tokens: Array<{ id: string; text: string; pos: "명사"|"동사"|... }>;  // 어절 + 정답 품사
    posPalette: string[];  // ex: ["명사","동사","형용사","조사",...]
  }
  ```
- **콘텐츠 분량 V0**: 5장 (단문 → 복문 → 인용절 → 시 한 행 → 속담)

### M3 — 분류 트리 (생물 분류)

- **gameId**: `bio-taxonomy` (V0 명확화 — 윤리·사회 분류는 V1+ 별 게임 `ethics-classification` 등으로 분리)
- **과목 · 단원**: 과학 / 고1 생명과학 — 생물 분류
- **인터랙션**: 카드 탭 → active → 카테고리 박스 탭 → 배치. 카테고리 안 카드 탭 → 풀로 복귀. 드래그 X (모바일 친화, M2 패턴 재사용)
- **GameMechanic 매핑**: `sorting` (D1=A 채택 — 기존 5종 안에서 매핑)
- **카테고리 max**: 4 (모바일 480px 폭 제약. 5계 분류는 V1+)
- **retrieval depth**: medium — 카드 속성을 카테고리 기준에 매핑
- **변별 포인트**: 끼워맞추기 회피 — "정답 확인" 클릭 전엔 정/오 표시 없음. wrong 시 정확도(`n/m`) 만 노출, 카드별 정/오 강조 X. 한 카테고리 카드 수 비공개
- **schema 스케치**:
  ```ts
  problem: {
    categories: Array<{ id: string; label: string }>;  // 2~4개
    items: Array<{ id: string; label: string; categoryId: string }>;  // 6~10장. 카드 = 정답 카테고리 매핑
  }
  ```
- **콘텐츠 분량 V0**: 5장, 모두 생명과학 (D3 결정):
  1. 진핵 vs 원핵 (카테고리 2, 카드 6)
  2. 동물·식물·균류 (카테고리 3, 카드 6)
  3. 척추 vs 무척추 동물 (카테고리 2, 카드 6)
  4. 선태·양치·겉씨·속씨식물 (카테고리 4, 카드 8)
  5. 척추동물 4강 — 어류·파충류·조류·포유류 (카테고리 4, 카드 8). 양서류는 V1+
  → 5계 분류, 윤리 사상가 등은 V1+ 별 게임으로 분리

## 2. 우선순위 가설

| 순위 | 메커닉 | 이유 |
|---|---|---|
| 1 | **M1 펀넷 사각형** | 학습효과 가장 명확(정확한 비율 답) + 변별력 강(입력형, 끼워맞추기 불가) + 인터랙션 신선도 ↑ |
| 2 | **M2 품사 태깅** | 국어 라인업 0 → 1 채움. 콘텐츠 무한 확장 가능 (문학 한 줄씩). retrieval 빈도 ↑ |
| 3 | **M3 분류 트리** | 범용성 최강(범과목) 이지만 끼워맞추기 위험 살짝 있음 + V0 콘텐츠 선택 분기 필요 |

## 3. 결정점

### D1 — `GameMechanic` 타입 확장 여부

옵션:
- **A (추천)** 기존 5종 안에 매핑 — M1=manipulation, M2=multiple-choice, M3=sorting. `src/lib/games/types.ts` 변경 없음. 필터링 일관성 유지.
- **B** 새 메커닉 추가 — `grid-fill`, `tagging`, `categorization` 3종 추가. types.ts + filter.ts + filter.test.ts + (UI 필터 라벨) 변경. 카탈로그 메커닉 5종 → 8종.

→ **A 추천 이유**: 메모리 룰 "단일 백본". 메커닉 5종은 이미 학습이론적 분류라 무리하게 늘리면 필터링 의미 흐림. 단, M1 이 manipulation 으로 묶이긴 하지만 결 다르므로 `tagline` 으로 차별화.

### D2 — Phase 분할 + 진행 순서

옵션:
- **A (추천)** 한 게임씩 별 PR — M1 → M2 → M3 순차. 각 PR scope 명확, 회귀 위험 분리. 머지 후 자가 검증 룰과 정합.
- **B** 3개 묶음 1 PR — 회귀 한 번에 처리. 코드 review 어려움.
- **C** M1 만 우선 → 효과 보고 M2·M3 결정. 가장 보수적.

→ **A 추천 이유**: 게임 신규는 manifest+schema+component+content+e2e 등 변경 면이 넓음. 묶으면 리뷰 부담 큼. 별 PR 이 머지·롤백·검증 모두 안전.

### D3 — M3 V0 콘텐츠 범위 ✓ (2026-05-13 정리 — A 채택)

옵션:
- **A (채택)** 생명과학 5장 단일 과목으로 V0 출시 → 윤리/사회는 V1+ 별 게임으로 분리 (`ethics-classification` 등)
- B 생명과학 3 + 윤리 2 혼합 → subject 라벨 모호, 기존 패턴(한 게임 = 한 과목) 이탈

→ **A 채택 이유**: subject 라벨·미리보기 뱃지 일관성. gameId 도 `bio-taxonomy` 로 명확화 — V1 부터 다른 분류 게임은 별 game id.

### D4 — M3 인터랙션 패턴 🔄 2026-05-13 뒤집기 — Drag-and-drop 채택

옵션:
- ~~A (초기 채택)~~ 클릭/탭으로 active 카드 선택 → 카테고리 박스 탭 → 배치 (M2 패턴)
- **B (재채택)** 드래그 앤 드롭 (factorization 패턴) — 1단계 메커닉, 시각적 연속성, manipulation 게임군과 결 일관

→ **뒤집기 사유**: V0 click-to-assign 의 2단계 인터랙션 + 풀 복귀 비직관 — 사용자 검토에서 부적합 확인. 상세: [2026-05-13_bio-taxonomy-drag-drop.md](2026-05-13_bio-taxonomy-drag-drop.md). PR #34 안에서 새 commit 으로 교체 (E4=B 채택).

### D5 — M3 카테고리 max ✓ (2026-05-13 정리 — 4 채택)

옵션:
- **A (채택)** 카테고리 max 4 — 모바일 폭 제약. 5계 분류는 V1+
- B max 5 — 가로 박스 5개, 모바일 좁음

## 4. 작업 항목 (D1=A / D2=A 채택 가정, M1 부터 진행)

### M1 펀넷 사각형 (PR 1)

- [x] `src/games/genetics-punnett/` 폴더 신규
  - [x] `manifest.ts` (subject=과학, unit=생명과학 유전, mechanic=manipulation, retrievalDepth=deep)
  - [x] `schema.ts` (`CardBaseSchema.extend({ type: "genetics-punnett", problem: ... })`)
  - [x] `logic/checkRatio.ts` + test (입력 비율 vs expectedRatio 약분 비교)
  - [x] `logic/computeOffspring.ts` + test (부모 유전자 → gametes 외적 격자 자동 채움 순수함수)
  - [x] `components/PunnettGrid.tsx` + `components/RatioInput.tsx` (격자 + +/- 입력)
  - [x] `component.tsx` (5-phase 상태머신, "정답 확인" 버튼)
  - [x] `content/index.ts` (5장 — 단성 자손교배 → 검정교배 → 양성 검정교배 → 부분이형 양성 → 9:3:3:1)
  - [ ] `previews/genetics-punnett.png` (별 trk — 디자이너 미리보기 자산)
  - [x] `README.md`
- [x] `bun run gen:registry` → 15 → 16 게임
- [x] e2e — `viewport.spec` OFFICIAL_GAMES 에 추가 (5 viewport + chrome spec 7/7 pass)
- [x] 과목 뱃지 — subject="과학" 이미 매핑 존재 확인

### M2 품사 태깅 (PR 2 — M1 위에 stack)

- [x] `src/games/korean-pos-tagging/` 폴더 신규 (구조 동일)
  - [x] schema: 어절 토큰 + 7 품사 enum + 정답
  - [x] logic/checkTagging.ts + test (token-by-token 비교 + 정확도)
  - [x] components/SentenceTokens.tsx + PalettePicker.tsx (POS_TOKEN_CLASS 색 매핑)
  - [x] component.tsx (탭으로 어절 선택 → 팔레트 클릭 → 색 적용 + 다음 미태깅 토큰 자동 이동)
  - [x] content/index.ts (5장 — 단문 → 형용사·부사 → 관형사 → 대명사 → 7품사 종합)
- [x] registry 재생성 → 17 게임
- [x] e2e — 7/7 PASS (5 viewport + chrome). subject="국어" 매핑 기존 활용

### M3 분류 트리 (PR 3 — M2 위 stack, bio-taxonomy)

- [x] `src/games/bio-taxonomy/` 폴더 신규 (gameId 명확화 — D3 결정)
  - [x] manifest.ts (subject=과학, unit=생명과학 분류, mechanic=sorting, retrievalDepth=medium)
  - [x] schema: categories[2~4] + items[6~10] + refine(categoryId ∈ categories.id)
  - [x] logic/checkAssignments.ts + test (item-by-item categoryId 비교 + 정확도)
  - [x] components/CategoryBox.tsx + ItemCard.tsx (click-to-assign — D4 결정)
  - [x] component.tsx (5-phase, active item → category 탭 = 배치, 카테고리 안 카드 탭 → 풀 복귀)
  - [x] content/index.ts (5장 — 진핵·원핵 → 동·식·균 → 척추·무척추 → 식물 4분류 → 척추동물 4강)
- [x] registry → 18 게임
- [x] e2e — 7/7 PASS (5 viewport + chrome). subject="과학" 매핑 기존 활용

## 5. 비스코프

- 기존 15게임 변별력/UI polish (별 plan — `2026-05-13_game-discrimination-phase3.md` 등)
- FSRS / 추천 알고리즘 변경
- 디자인 토큰 신규 도입 (subject badge 매핑은 기존 활용)
- 윤리/사회 과목 콘텐츠 별도 확장 (D3 — 본 plan 외)

## 6. 자가 검증 체크리스트 (각 PR 머지 후 — 2026-05-13)

memory 룰 `plan_workflow.md` 적용 — 머지 직후 본 plan §4 체크리스트 모두 ✅ 확인:

- [x] manifest 자동 발견 (`registry.generated.ts` 에 3 게임 모두 import 됨, 18 게임)
- [x] `/games/{genetics-punnett, korean-pos-tagging, bio-taxonomy}` 라우트 SSR HTTP 200
- [x] e2e 회귀 통과 — `viewport.spec` 3 게임 × 5 viewport + chrome = **21/21 PASS**
- [x] `bun run typecheck` PASS
- [x] `bun run test` — **134/134 vitest PASS**
- [ ] 5장 카드 모두 정답 입력 시 correct → next 정상 진행 — **실기기 확인 필요**
- [ ] 오답 입력 시 wrong-flash + 재시도 가능 — **실기기 확인 필요**
- [ ] 미리보기 카드에 SubjectBadge 정상 노출 — 게임 허브 페이지에서 확인 필요
- [ ] bio-taxonomy 드래그 정밀도 (모바일 Chrome / Safari) — **실기기 필수**
- [ ] `vercel --prod` 배포 후 production URL 실기기 확인 — 사용자 권한

## 7. 합의 후 진행

추천안 D1=A / D2=A 그대로면 "추천대로 진행" 한 줄로 OK → M1 펀넷 사각형 부터 코드 작업 시작. 다른 조합이면 본 plan 업데이트 후 진행.
