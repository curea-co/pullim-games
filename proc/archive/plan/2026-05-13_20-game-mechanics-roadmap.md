# 2026-05-13 — 게임 20종류 라인업 로드맵

## 목표
풀림 게임즈에 **인터랙션 패턴 = 종류** 기준 unique game type 을 20개 갖춘 라인업으로 확장. 같은 메커닉의 과목·단원 swap (예: `vocab-typing` ↔ `english-vocab-typing`) 은 **종류로 카운트하지 않음**.

## 트리거
사용자 요청 — "게임을 다양하고 또 많이 제공하고 싶다. 게임이 20종류가 되도록 plan 으로 기획해줘." 종류 정의: "어휘 타이핑 처럼 과목만 바꾼 건 같은 종류".

## 메모리 룰 적용
- 학습효과 > 중독성, PVE 지향 → retrieval depth + 가설 수립 흐름 우선
- 하이퍼캐주얼 유지 (RPG 확장 금지) → 메커닉 1개 = 인터랙션 1개, 5분 이내 완결
- 단일 백본 + 다중 게임 모드 → 신규 메커닉도 FSRS/스트릭/registry 공유, manifest 만 분리
- 답지 노출 + 끼워맞추기 회피 → 모든 신규에 확정 버튼 패턴 적용
- 결단력 있게 실행 → 9개 신규 후보 모두 본 plan 에 병렬 명세, 갈래 묻지 않음

## 0. 카운트 정의

> "종류" = **인터랙션 패턴 (interaction pattern)** 1개. 동일 패턴을 다른 과목/단원에 적용한 게임은 1종.

예시 (현재 라인업 매핑):
- `vocab-typing` + `english-vocab-typing` + `custom-typing` → "타이핑 retrieval" **1종**
- `english-word-match` + `custom-word-match` → "짝짓기" **1종**
- `math-quick-quiz` + `english-blank` + `custom-blank` + `custom-multiple-choice` → "객관식 단답" **1종**
- `factorization` ≠ `math-graph-shift` — 둘 다 manipulation 이지만 항블록 드래그 vs 슬라이더 → 결 자체가 다르므로 **2종**

`GameMechanic` enum 5종 (manipulation/sorting/matching/multiple-choice/typing) 은 단일 백본 룰에 따라 **확장하지 않음**. 종류 = manifest 단위 인터랙션 패턴 (필터 라벨이 아닌 사용자 인지 단위).

## 1. 현재 11 unique types (18 게임 → 메커닉 PATTERN 묶음)

| # | 종류 (인터랙션 패턴) | 매핑 게임 | mechanic enum |
|---|---|---|---|
| 1 | 다항식 항블록 드래그 분리 | factorization | manipulation |
| 2 | 슬라이더 → 그래프 평행/대칭 이동 | math-graph-shift | manipulation |
| 3 | 화살표 드래그 → 벡터 합성 | physics-vector | manipulation |
| 4 | 반응식 계수 카운터 균형 | chemistry-balance | manipulation |
| 5 | 카드 순서 정렬 (시간순/어순) | history-timeline, english-order | sorting |
| 6 | N:N 짝짓기 | english-word-match, custom-word-match | matching |
| 7 | 객관식 단답 / 빈칸 | math-quick-quiz, english-blank, custom-blank, custom-multiple-choice | multiple-choice |
| 8 | 출력형 타이핑 retrieval | english-vocab-typing, vocab-typing, custom-typing | typing |
| 9 | 펀넷 격자 자동 채움 + 비율 입력 | genetics-punnett | manipulation |
| 10 | 어절 색칠 in-line 태깅 | korean-pos-tagging | multiple-choice |
| 11 | 카드 → 카테고리 분류 (drag-and-drop) | bio-taxonomy | sorting |

→ **11종**. 20 달성을 위해 **+9 신규 메커닉** 필요.

## 2. 신규 9 unique types 후보 (N1~N9)

각 후보는 (a) 학습효과, (b) 인터랙션 distinct, (c) 5분 완결, (d) 끼워맞추기 회피 4축으로 평가. 카드 분량은 V0 5장 표준 따름.

### N1 — 등식 단계 풀이 (Step solver)
- **gameId 후보**: `equation-solver`
- **인터랙션**: 좌·우변 양쪽에 같은 연산 적용 (버튼 `+a` / `-a` / `×a` / `÷a` / `이항`) → 한 줄씩 식이 변형되며 누적 표시 → 마지막에 `x = ?` 형태 도달 → "정답 확인"
- **subject 후보**: 수학 — 일차/이차방정식 풀이, 분수 정리, 비례식. 화학 — 평형이동 (르샤틀리에)
- **mechanic enum**: manipulation
- **retrieval depth**: deep — 절차적 지식 (procedural). 단계마다 의사결정
- **변별 포인트**: 사용자가 매 단계 직접 연산 선택 → 답지 노출 0. 같은 답 다른 경로 OK (logic 은 양변 동치성만 검사)

### N2 — 이미지 핫스팟 (Hotspot picker)
- **gameId 후보**: `image-hotspot`
- **인터랙션**: 이미지 표시 + 하단에 라벨 카드 → 라벨 카드 탭 → active → 이미지 위 영역 클릭 → 배치. 모든 라벨 배치 후 "정답 확인"
- **subject 후보**: 과학 — 인체 해부, 식물 구조, 세포 소기관. 사회 — 한반도 지도 위 사건 위치, 세계 지리. 미술/문학 — 그림 속 요소 명명. 영어 — 그림 어휘
- **mechanic enum**: matching (image-region ↔ label 매칭)
- **retrieval depth**: medium — 시각 회상 + 명칭 매칭
- **변별 포인트**: 영역 좌표 hit-test → 끼워맞추기 불가. 카드 풀 / 영역 max 6 (모바일 가독)

### N3 — 좌표 plot / 수직선 (Coordinate plot)
- **gameId 후보**: `coordinate-plot`
- **인터랙션**: 좌표평면 (또는 수직선) + 점 카드 → 점을 드래그해 정확한 좌표에 놓기. 격자 스냅. 여러 점 모두 배치 후 "정답 확인"
- **subject 후보**: 수학 — 일차함수, 이차함수, 평행이동, 분수/소수의 수직선 위치, 부등식 구간. 통계 — 산점도 점 찍기
- **mechanic enum**: manipulation
- **retrieval depth**: medium~deep — 식 → 좌표 변환
- **변별 포인트**: 격자 스냅이지만 좌표 자체가 답 → 끼워맞추기 어려움. (스냅 단위는 단원별 — 정수/0.5/분수)

### N4 — 다이어그램 선 연결 (Diagram wiring)
- **gameId 후보**: `diagram-wiring`
- **인터랙션**: 노드들이 배치된 화면 → 노드 A 탭 → 노드 B 탭 → 선 연결. 같은 선 두 번 탭 = 취소. 정답 연결 set 완성 후 "정답 확인"
- **subject 후보**: 영어 — 문장 성분 다이어그램 (주어·동사·목적어·수식어 라인). 과학 — 화학결합, 회로, 먹이사슬. 사회 — 가계도, 인과관계
- **mechanic enum**: matching (N:M 연결, word-match 보다 위상 자유로움)
- **retrieval depth**: medium — 구조 인식
- **변별 포인트**: 연결 set 의 정확한 조합만 정답. 순서 무관. 끼워맞추기 불가 (연결 수가 정해져 있음)

### N5 — 계층 트리 빌더 (Hierarchy tree)
- **gameId 후보**: `tree-builder`
- **인터랙션**: 루트 노드 고정 → 카드 풀에서 카드 선택 → 트리 빈 슬롯 탭 → 배치. 다단계 (root → 2-3-level). 모든 슬롯 채움 후 "정답 확인"
- **subject 후보**: 수학 — 소인수분해 트리 (60 = 2×2×3×5), 약수 트리. 과학 — 분류 계통수 (bio-taxonomy 보다 깊이 있음, 강·목·과·종). 국어 — 문장 파스 트리. 사회 — 정부 조직도
- **mechanic enum**: sorting
- **retrieval depth**: deep — 위계 관계 파악
- **변별 포인트**: bio-taxonomy 와 다른 점 = **계층 깊이**. 같은 카드라도 위치 (depth + parent) 가 답. 모바일 폭 제약상 깊이 3, 폭 4 max

### N6 — 자모/문자 조합 (Letter assembly)
- **gameId 후보**: `letter-assembly`
- **인터랙션**: 빈칸 슬롯 (단어 길이) + 자모 카드 풀 → 카드 드래그 → 슬롯에 채움 → "정답 확인". 한글은 초성·중성·종성 분리 슬롯
- **subject 후보**: 국어 — 한글 자모 결합, 한자 부수 조합. 영어 — 알파벳으로 단어 완성 (스펠링). 단어 풀 = retrieval 보조 (타이핑 보다 진입 낮음)
- **mechanic enum**: manipulation
- **retrieval depth**: shallow~medium — 부분 retrieval (보기 있음)
- **변별 포인트**: typing 보다 진입 쉬움, MC 보다 retrieval 깊음. 카드 풀에 distractor 포함 → 끼워맞추기 회피

### N7 — 균형 저울 (Balance scale)
- **gameId 후보**: `balance-scale`
- **인터랙션**: 좌·우 접시에 추(블록) 드래그 → 시각 저울이 기울었다/평형 표시 → 평형 도달 후 "정답 확인"
- **subject 후보**: 수학 — 등식 직관 (`3x + 2 = 5x - 4` 같은 식 시각화), 부등식 비교, 분수 비교. 과학 — 화학 평형 (반응물 ↔ 생성물 양 균형), 지렛대 원리 (물리)
- **mechanic enum**: manipulation
- **retrieval depth**: medium — 수식 ↔ 시각 변환
- **변별 포인트**: chemistry-balance (반응식 계수) 와 다른 점 = **시각적 양변 균형 그 자체가 메커닉**. 추 무게 다양화 가능

### N8 — 다중 빈칸 cloze (Cloze with palette)
- **gameId 후보**: `cloze-multi`
- **인터랙션**: 본문 한 단락 + 여러 빈칸 슬롯 + 보기 카드 풀 (정답 N + distractor M) → 카드 드래그 → 빈칸 배치 → "정답 확인"
- **subject 후보**: 영어 — 5형식 어순 강화, 수능 빈칸 추론 (멀티 빈칸 ver), 시제 일치. 국어 — 문장 구조, 접속사. 사회 — 인과관계 빈칸 채우기. 과학 — 광합성 식 빈칸
- **mechanic enum**: multiple-choice
- **retrieval depth**: medium — 문맥 추론 + 보기 선별
- **변별 포인트**: english-blank (단일 빈칸 4지선다) 와 다른 점 = **빈칸 N개 + 카드 풀 (N + distractor)**. 카드 자원 한정 → 조합 정확도 요구

### N9 — 도형 회전 (Geometry rotation)
- **gameId 후보**: `geometry-rotation`
- **인터랙션**: 도형이 화면 중앙에 표시 → 회전 다이얼/슬라이더 또는 90°/45° 회전 버튼 → 목표 도형과 일치 시 "정답 확인". 반사·평행이동 옵션 포함
- **subject 후보**: 수학 — 합동·닮음, 도형 회전·대칭, 시계 각도, 좌표 회전. 미술 — 패턴 회전. 과학 — 분자 입체구조 (V1+ 3D 옵션, V0 은 2D)
- **mechanic enum**: manipulation
- **retrieval depth**: medium — 공간 인지
- **변별 포인트**: math-graph-shift (그래프 슬라이더) 와 다른 점 = **도형 자체 + 회전/반사**. 함수 식이 아닌 기하 변환

### (보조 후보 — 본 plan §3 에서 우선순위 밀리면 V1+ 로 미룸)

- **N10 — 흐름도/순환 채우기** (`flowchart-cycle`): 광합성·물순환·세포호흡·역사 인과 순환. 카드 → 노드 슬롯. **N5 트리 빌더와 인접** (DAG vs 트리 결 차이). V0 9 안에 포함되면 우선순위 9위 후보.
- **N11 — 확률 시뮬레이션** (`probability-sim`): 주머니 공 뽑기·주사위. 시뮬레이션 카운터 + 예측. 학습 강도 OK 지만 단원 범위 좁음 (수학 확률·통계 1단원).

## 3. 우선순위 (V0 9개 선정 + 추천 순서)

평가축: 학습효과 ↑ / 인터랙션 distinct ↑ / 콘텐츠 확장성 ↑ / 구현 부담 ↓

| 순위 | 메커닉 | 학습 | distinct | 확장성 | 구현 | 합계 |
|---|---|---|---|---|---|---|
| 1 | **N2 이미지 핫스팟** | ●● | ●●● | ●●●(범과목) | ●● | 10 |
| 2 | **N1 등식 단계 풀이** | ●●●(절차) | ●●● | ●●(수학·화학) | ● | 9 |
| 3 | **N4 다이어그램 선 연결** | ●● | ●●● | ●●●(범과목) | ●● | 10 |
| 4 | **N3 좌표 plot** | ●● | ●● | ●●(수학·통계) | ●● | 8 |
| 5 | **N5 계층 트리 빌더** | ●●● | ●● | ●●●(범과목) | ●● | 10 |
| 6 | **N7 균형 저울** | ●● | ●● | ●●(수학·과학) | ●●(애니메이션) | 8 |
| 7 | **N8 다중 빈칸 cloze** | ●● | ●● | ●●●(범과목) | ●●● | 10 |
| 8 | **N6 자모/문자 조합** | ●● | ●● | ●●(국어·영어) | ●●● | 9 |
| 9 | **N9 도형 회전** | ●● | ●●● | ●(수학 기하 한정) | ● | 7 |

→ 모두 V0 9 안에 포함. N10/N11 은 V1+ 로 보류 (확장 슬롯).

**추천 진행 순서** (구현 부담 적은 것 + 콘텐츠 확장성 큰 것 우선):
M4 → N8 다중 빈칸 cloze (가장 가벼움, 기존 빈칸 컴포넌트 재활용)
M5 → N6 자모/문자 조합 (UI 작아 빠름)
M6 → N2 이미지 핫스팟 (콘텐츠 확장성 최강 — 한 메커닉 = 다 과목 무한)
M7 → N4 다이어그램 선 연결 (범과목)
M8 → N5 계층 트리 빌더 (범과목 + 깊이)
M9 → N3 좌표 plot (수학 핵심)
M10 → N1 등식 단계 풀이 (수학 핵심, 절차적 지식 — 약간 무거움)
M11 → N7 균형 저울 (시각 애니메이션 부담)
M12 → N9 도형 회전 (기하 한정, 마지막)

## 4. 결정점

### D1 — `GameMechanic` enum 확장 여부

옵션:
- **A (추천)** 기존 5종 유지 — 신규 9개도 manipulation/sorting/matching/multiple-choice 안에 매핑 (위 표 §2 참고). M1·M2·M3 plan 의 D1=A 정책 일관 유지.
- B `tagging`, `wiring`, `tree`, `plot` 등 enum 확장 — 카탈로그 필터 라벨 5종 → 9종+. 단일 백본 룰 흔들림.

→ **A 추천 이유**: 메모리 "단일 백본" + M1·M2·M3 선례. 필터 라벨이 의미적 분류라 무리하게 늘리면 사용자 혼선. tagline 으로 결 차별화.

### D2 — V0 콘텐츠 단원 단일 vs 혼합

옵션:
- **A (추천)** 메커닉 1개 = subject 1개로 V0 출시 (5장). 메모리 룰 "한 게임 = 한 과목" 일관. 범과목 메커닉 (N2/N4/N5/N8) 은 **V0 단원 1개 선택** → V1+ 다른 단원 추가 시 별 game id (예: `image-hotspot-anatomy` → V1 `image-hotspot-korean-map`)
- B V0 부터 멀티 과목 카드 혼합 — subject 라벨 모호

→ **A 추천 이유**: subject 뱃지·미리보기·필터 일관성. bio-taxonomy 결정 (D3=A) 과 정합.

| 메커닉 | V0 단원 (추천) |
|---|---|
| N2 image-hotspot | 과학 — 인체 해부 (소화·호흡·순환·뇌·골격) |
| N1 equation-solver | 수학 — 일차/이차방정식 풀이 (이항·인수·근의공식) |
| N4 diagram-wiring | 영어 — 문장 성분 다이어그램 (S/V/O/M) |
| N3 coordinate-plot | 수학 — 일차함수 그래프 (점 찍기 5장) |
| N5 tree-builder | 수학 — 소인수분해 트리 |
| N7 balance-scale | 수학 — 일차방정식 시각화 |
| N8 cloze-multi | 영어 — 5형식 어순 멀티 빈칸 |
| N6 letter-assembly | 국어 — 한자 부수 조합 |
| N9 geometry-rotation | 수학 — 도형 합동 (회전·대칭) |

### D3 — 진행 방식

옵션:
- **A (추천)** 메커닉 1개 = 별 PR (M4 ~ M12 총 9 PR). M1·M2·M3 선례. 머지·롤백·자가검증 안전.
- B 메커닉 3개씩 묶어 3 PR — 리뷰 부담 큼
- C 1 PR 9 메커닉 — 비현실

→ **A**.

### D4 — 진행 페이스

옵션:
- A 한꺼번에 9개 전부 (다음 1주~2주 안)
- **B (추천)** 우선순위 상위 3개 (M4·M5·M6) 먼저 머지 → 라인업 14종 도달 → 사용자 검토 → 나머지 6개 점진 진행
- C 1개씩 머지 후 매번 합의

→ **B 추천 이유**: M1·M2·M3 패턴 (3개 묶어 라운드 진행) 유효. 9개 일괄은 회귀 부담 + 메커닉 검증 피드백 사이클 길어짐. 한 라운드 = 3 PR 이 sweet spot.

## 5. 작업 항목 (Round 1 — M4·M5·M6 우선)

### M4 — N8 다중 빈칸 cloze (PR 4) ✅ 코드 완료 (2026-05-13)
- [x] `src/games/cloze-multi/` 폴더 생성
  - [x] manifest.ts (subject=영어, unit=5형식 어순, mechanic=multiple-choice, retrievalDepth=medium)
  - [x] schema.ts (`type: "cloze-multi"`, passage=discriminated union(text|blank), blanks[2~5], cards[N+distractor])
  - [x] logic/checkCloze.ts + test (blank-by-blank cardId 비교 + 정확도, 5/5 PASS)
  - [x] components/ClozePassage.tsx + CardPalette.tsx (click-to-assign 패턴)
  - [x] component.tsx (5-phase, distractor 포함, 정확도 노출)
  - [x] content/index.ts (5장 — SV → SVC → SVO → SVOO → SVOC)
  - [x] README.md
- [x] `bun run gen:registry` → 19 게임
- [x] e2e — viewport.spec helpers/games.ts 등록, 6/6 viewport PASS

### M5 — N6 자모/문자 조합 (PR 5) ✅ 코드 완료 (2026-05-13)
- [x] `src/games/letter-assembly/` 폴더 생성
  - [x] manifest.ts (subject=국어, unit=한자 부수, mechanic=manipulation, retrievalDepth=medium)
  - [x] schema.ts (`type: "letter-assembly"`, target+slots+cards)
  - [x] logic/checkAssembly.ts + test (slot-by-slot, 4/4 PASS)
  - [x] components/SlotRow.tsx (좌→우 + "+") + ComponentPalette.tsx (한자 + 한글 음 라벨)
  - [x] component.tsx (5-phase, distractor 부수 포함, 정답 시 한자+의미+음 노출)
  - [x] content/index.ts (5장 — 林 → 明 → 休 → 好 → 森)
  - [x] README.md
- [x] registry → 20 게임
- [x] e2e — 6/6 viewport PASS

### M6 — N2 이미지 핫스팟 (PR 6) ✅ 코드 완료 (2026-05-13)
- **V0 단원 변경**: 인체 해부 → **식물 구조 5장** (꽃·잎·뿌리·줄기·씨앗). 사유: 인체 해부 SVG 부담 ↑, 식물이 학습 일관성 ↑. 메커닉 동일 → V1+ 별 game id 로 인체 해부 확장 가능.
- [x] `src/games/image-hotspot/` 폴더 생성
  - [x] manifest.ts (subject=과학, unit=식물 구조, mechanic=matching, retrievalDepth=medium)
  - [x] schema.ts (`type: "image-hotspot"`, diagramId enum + regions[bbox] + cards[label])
  - [x] logic/checkHotspot.ts + test (region-by-region, 4/4 PASS)
  - [x] components/PlantDiagram.tsx (5종 inline SVG 도식 — flower/leaf/root/stem/seed)
  - [x] components/HotspotCanvas.tsx (도식 + 절대좌표 bbox overlay) + LabelPalette.tsx
  - [x] component.tsx (5-phase, distractor 1개 포함)
  - [x] content/index.ts (5장 — 꽃 4r → 잎 3r → 뿌리 4r → 줄기 4r → 씨앗 3r)
  - [x] README.md
- [x] registry → 21 게임
- [x] e2e — 6/6 viewport PASS (SVG hydration mismatch 수정: `Math.round(x*100)/100` 으로 부동소수점 round)

**Round 1 머지 후 → 라인업 14 unique types 달성**. 사용자 검토 받은 후 Round 2 (M7~M9) 진입.

### M7~M12 (Round 2·3 — 합의 후 본 plan 업데이트)
- M7 — N4 다이어그램 선 연결 (영어 문장 성분)
- M8 — N5 계층 트리 빌더 (수학 소인수분해)
- M9 — N3 좌표 plot (수학 일차함수)
- M10 — N1 등식 단계 풀이 (수학 일차/이차방정식)
- M11 — N7 균형 저울 (수학 일차방정식 시각화)
- M12 — N9 도형 회전 (수학 도형 합동)

→ **M12 머지 후 라인업 20 unique types 달성**.

## 6. 비스코프

- 기존 11종 게임 polish/변별력 개선 (별 plan)
- FSRS / 추천 알고리즘 변경
- GameMechanic enum 확장 (D1=A — 본 plan 외)
- AI 자동 콘텐츠 생성 (V0 9개 모두 손작업 5장)
- 음성/리듬·자유드로잉 메커닉 (채점 인프라 부담, V1+)
- N10/N11 보조 후보 (V1+ 확장 슬롯)
- 인체 해부 외 핫스팟 콘텐츠 (한반도 지도·세계 지리 등) → V1+ 별 game id (N2 메커닉 재사용)

## 7. 자가 검증 체크리스트 (각 Round 머지 후)

memory 룰 `plan_workflow.md` 적용:

### Round 1 (M4·M5·M6) 머지 전 자가검증 ✅ (2026-05-13)
- [x] manifest 자동 발견 — registry 21 게임 (18 → 21)
- [x] 신규 3 라우트 SSR HTTP 200 (e2e `expect(res.status()).toBe(200)` 통과)
- [x] e2e `viewport.spec` — 3 게임 × 6 viewport = **21/21 PASS** (image-hotspot SVG hydration 수정 후)
- [x] `bun run typecheck` PASS
- [x] `bun run test` — **20 files, 147/147 vitest PASS** (134 → 147, 신규 13개)
- [x] 5장 카드 모두 정답 입력 시 correct → next 정상 진행 — 사용자 확인 (2026-05-13)
- [x] 오답 시 wrong-flash + 재시도 가능 — 사용자 확인 (2026-05-13)
- [x] 미리보기 카드 SubjectBadge 노출 — 사용자 확인 (2026-05-13)
- [x] 이미지 핫스팟 — bbox hit-test 정밀도 (모바일 Chrome / Safari) — 사용자 확인 (2026-05-13)

### Round 2·3 도 동일 패턴

## 8. 합의 후 진행

추천안 D1=A / D2=A / D3=A / D4=B 그대로면 "추천대로 진행" 한 줄로 OK → **M4 다중 빈칸 cloze** 부터 코드 작업 시작. 다른 조합이면 본 plan 업데이트 후 진행.
