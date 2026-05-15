# 2026-05-14 — factorization 변별력 강화 (drag-to-chip)

- **상태**: ACCEPTED (2026-05-15) — §1 drag-to-chip 메커닉 + §2 D1~D4 추천안 채택 합의. Phase 1 (schema/buildCard distractor) 부터 진입.
- **트리거**: 사용자 피드백 — "이 게임 변별력이 하나도 없어. 모든 카드를 드래그해도 정답이래."
- **연관 audit**: `proc/audit/2026-05-14_games-catalog-audit.md` §3 — "변별력 정책 준수 21/21" 결론은 **factorization 에 대해 잘못 판정** (audit miss). BUG-2 PR #43 은 hit-test 정합성만 고쳤고, 메커닉 자체의 변별력 0 이슈는 본 plan 에서 처리.
- **메모리 룰**: 학습효과 > 중독성. 답지 노출 회피. 끼워맞추기 회피. 단일 백본 + 다중 모드 (FSRS 등급 정상화 포함).

---

## 0. 근본 원인 (재진술)

현 메커닉:

1. `buildCard.ts` 가 모든 term 의 공통인수 part 를 `isCommon: true` 로 마킹 → `TermBlock.tsx` 가 jade 하이라이트로 **답을 시각적으로 노출**.
2. `component.tsx` `handleDragEnd` (line 130-144) 의 정답 판정 = `insideDropZone` 그것뿐. 어떤 블록이든 dropZone 영역에 떨어지면 success.
3. 카드 데이터에서 미리 계산된 `factoredForm` 을 출력 → 학생의 답안이 검증 사슬에 진입하지 않음.
4. `checkAnswer.ts` 의 `arePolynomialsEqual` / `deriveAnswer` 는 정의돼 있지만 component 에서 호출 0회.
5. FSRS 가 항상 `reviewCard(prev, "good")` 으로 갱신 → 우선순위 큐가 학습 신호 없이 회전.

→ retrieval practice 가 0. "답 보고 끌면 끝" 메커닉은 학습 가치가 없고, 메모리 룰 위반.

---

## 1. 추천 메커닉 — drag-to-chip

학생 흐름:

1. 다항식 블록 표시 (jade 하이라이트 **제거** — 어디가 공통인수인지 노출 안 함).
2. dropZone 자리에 **공통인수 후보 chip 3 개** (정답 1 + 함정 2) 표시. shuffle 순서.
3. 학생이 term block 하나를 chip 위로 드래그 → 떨어진 chip 이 정답이면 success → 변형 애니메이션. 오답이면 spring-back + 시도 카운트 증가.
4. 시도 횟수 → FSRS 등급:
   - 1회 정답 → `good`
   - 2회 정답 → `hard`
   - 3회+ → `again`
5. 다음 카드 진행은 정답 도달 시에만 가능 (수정 옵션 없음 — 끼워맞추기 회피).

### 갈래 분석 (검토 후 배제)

| 안 | 메커닉 | 채택 여부 | 근거 |
|---|---|---|---|
| A | dropZone 후보 chip 3개 (탭 선택) | 변형 채택 | E 와 본질 동일, 단지 인터랙션 모달리티 차이. drag 보존 위해 E |
| B | 각 term 의 part 를 직접 tap → 공통인수 마킹 → 확인 | 배제 | UI 복잡, 모바일 hit-test 위험, V0.4 치환·삼차차 등 다른 인수분해 기법 일반화 불가 |
| C | 텍스트/숫자 입력 (vocab-typing 패턴) | 배제 | drag 메커닉 폐기, SPEC 손가락으로 끌어내기 핵심 가치 손실 |
| D | "어떤 term 을 드래그했는가" 검증 | 배제 | 모든 term 이 같은 공통인수 → 어느 term 이든 정답. 변별 불가 (논리적으로 깨진 안) |
| **E** | **drag-to-chip (term block → 후보 chip)** | **채택** | drag 보존 + 변별 + chip 패턴은 향후 모든 인수분해 기법에 일반화 가능 + 모바일 OK + 큰 변경 아님 |

### 함정 chip (distractors) 자동 생성 룰

`buildCard.ts` 에서 정답 공통인수 + 다항식 구조 기반으로 함정 2 개 자동 생성:

- 정답이 `2x` (계수 + 변수) → 후보: `2`, `x`, `4`, `4x`, `2x²` 중 다른 term 에 안 나오는 것 우선
- 정답이 `4x` → 후보: `2x`, `4`, `x`, `2`, `8x`
- 정답이 `5` (상수) → 후보: `10`, `x`, `5x`, `2`
- 우선순위: ① 정답의 약수만 (계수/지수 한 단계 약화) → ② 다항식에 등장하는 term 의 일부 → ③ 정답의 배수
- 자동 생성으로 부족하면 카드별 hand-curate 옵션을 schema 에 남김

→ 콘텐츠 큐레이터 추가 부담 0. 필요 시 `distractors?: string[]` optional 로 override.

---

## 2. 결정점

### D1 — chip 표시 위치

옵션:
- **(A 추천)** dropZone 자리에 가로 3 chip — 현 dropZone 영역을 chip rack 으로 대체.
- (B) 화면 하단 별도 rack — dropZone + chip rack 동시 표시.

→ A 채택. dropZone 의 "여기로 끌어내세요" 의미 = chip rack 자연스럽게 계승. 화면 분할 절약.

### D2 — 시도 횟수 노출

옵션:
- (A) 시도 횟수 비노출, 내부적으로만 FSRS 등급에 사용.
- **(B 추천)** 오답 시 짧은 spring-back + 시도 카운트 무노출, 단 3회 정답 도달 못 하면 "정답을 보여드릴게요" 옵션 제공 (학습 막힘 방지).
- (C) 매 시도마다 카운트 노출 (`시도 1/∞`).

→ B 채택. C 는 점수 압박, A 는 무한 시도 가능 → 끼워맞추기. B 는 3회 후 자발적 reveal → "이건 어렵구나" 메타인지 형성. (단 reveal 시 FSRS 는 `again` 고정.)

### D3 — jade 하이라이트 완전 제거 vs 정답 후 노출

옵션:
- **(A 추천)** 처음엔 완전 제거. 정답 chip 선택 후 변형 애니메이션 시 jade 노출.
- (B) 처음부터 일부 노출 (예: 첫 카드 튜토리얼만).

→ A 채택. 튜토리얼은 hint 텍스트(`card.hint`)로 충분.

### D4 — chip rack 에 안 떨어뜨리고 빈 공간에 release 시 처리

옵션:
- **(A 추천)** spring-back, 시도 카운트 변동 없음. PR #43 의 hit-test 정합성 유지.
- (B) 시도 카운트 증가.

→ A 채택. "내려놓기 = 취소" 의미 보존, BUG-2 fix 의 사용자 멘탈 모델 유지.

---

## 3. 작업 항목

### Phase 1 — schema/logic ✅ (PR #48 머지 2026-05-15)

- [x] `schema.ts` `FactorizationProblemSchema` 에 `distractors` 추가 (Phase 1 진입 시 `.optional()`, Phase 2 component 통합 시 `.length(2)` required 전환 예정).
- [x] `buildCard.ts` 에 distractor 자동 생성 함수 (`generateDistractors(factor, poly): [string, string]`) 추가 — ①약수(계수약화/변수만/계수만/지수-1) ②다항식 term 일부 ③배수(계수2배/지수+1).
- [x] `buildCard.test.ts` distractor 생성 케이스 6종 (계수+변수 / 계수만 / 변수만 / 윗첨자 / 자동 포함 / override) 추가.
- [x] `buildCard.ts` 에서 모든 term 의 `isCommon` 마킹 **유지** (변경 없음, Phase 2 component phase 분기로만 사용 예정).

### Phase 2 — component

- [ ] `component.tsx` 에 chip rack 컴포넌트 (`<FactorChipRack candidates={...} onPick={...} />`) 추가.
- [ ] `handleDragEnd` 에서 dropZone hit-test → chip hit-test 로 변경. 각 chip 의 boundingClientRect 검사.
- [ ] 정답 chip → 기존 변형 애니메이션 흐름 (extracting → done).
- [ ] 오답 chip → spring-back + 시도 카운트 증가 + 짧은 wrong-flash (jade 하이라이트 노출 X).
- [ ] 3회 시도 후 "정답을 보여드릴게요" 옵션 노출. reveal 시 FSRS `again`.
- [ ] FSRS 등급 분기 (`reviewCard(prev, attempt === 1 ? "good" : attempt === 2 ? "hard" : "again")`).
- [ ] `BeforeView` 의 `TermBlock` 에 jade 하이라이트 prop `revealCommon: boolean` 추가, default false. 정답 chip 선택 후 true.

### Phase 3 — content 검증

- [ ] `content/index.ts` 10 장 모두 buildCard 실행 후 distractor 가 정답과 다르고 의미 있는지 (모든 term 의 일부 분해형이 함정으로 들어가지 않는지) 자동 assert.
- [ ] 실패 카드 발견 시 hand-curate `distractors` 추가.

### Phase 4 — 검증

- [ ] vitest — buildCard distractor 케이스 / component 시도-FSRS 등급 매핑 / 오답 시 phase 변동
- [ ] e2e — `e2e/factorization-discrimination.spec.ts` 신규: 정답 chip drop → success / 오답 chip drop → spring-back + 카드 유지 / 3회 후 reveal 옵션 / 빈 공간 drop → 변동 없음 (PR #43 회귀 보존).
- [ ] `bun run typecheck` + `bun run test` + e2e 회귀 (기존 factorization-drag-hit-test.spec.ts 갱신 — chip 기준)

### Phase 5 — 머지 + 자가 검증 + 보고

- [ ] commit + PR + main 머지
- [ ] 머지 후 §3 작업항목 체크리스트 자가 검증
- [ ] audit 문서에 후속 fix 추가 행 (BUG-3 또는 BUG-2 미러 확장)
- [ ] 사용자 보고 (작업 항목 status + dogfooding 요청)

---

## 4. 비스코프

- 다른 인수분해 기법 (sum-product, 삼차차, 치환) — V0.4 별 game id 검토. 본 plan 은 공통인수만.
- 콘텐츠 큐레이터 UI — `distractors` 자동 생성으로 충분, 수동 override 만 schema 노출.
- daily 스트릭/배지 — 변별력 강화와 무관. 메모리 룰 (스케일 — 하이퍼캐주얼 유지) 준수.
- 다른 게임의 변별력 재감사 — 본 plan 은 factorization 단독. (audit 의 §3 결론은 별 plan 으로 재검 필요 — drag 메커닉 게임만 우선 = bio-taxonomy / english-order / history-timeline → 모두 click 기반이거나 정답 zone 별도 라 드래그 trigger ≠ 정답 노출 패턴은 factorization 단독 확인됨, audit §1 보완.)

---

## 5. 영향도

| 영역 | 변경 |
|---|---|
| schema | `distractors` 필드 추가 (optional → required for v0.4 — 본 plan 에선 required) |
| logic | `buildCard` distractor 생성 추가, `checkAnswer` 는 그대로 (활용 여부는 다음 phase) |
| component | dropZone → chip rack, FSRS 등급 분기, jade reveal 시점 변경 |
| content | 10 장 자동 마이그레이션 (buildCard 자동 생성), 실패 카드 hand-curate |
| e2e | 신규 spec 1 + 기존 spec 갱신 |
| FSRS | 등급이 정상 분포 → 우선순위 큐 신호 회복 |

---

## 6. 위험 + 대응

- **위험 1**: distractor 자동 생성이 모든 카드에서 의미 있는 함정을 만들지 못할 수 있음. → assert 기반 검증 + 실패 카드 hand-curate.
- **위험 2**: 3 chip 중 정답 위치가 항상 같으면 패턴 학습. → shuffle 매 카드.
- **위험 3**: 오답 시 시각 피드백 없으면 학생이 "왜 틀렸는지" 모름 → spring-back + chip 자체에 짧은 negative state (border red 200ms). 정답 chip 노출 X.
- **위험 4**: 모바일 chip hit area 협소. → chip min-width 80px + min-height 56px (image-hotspot UX-3 교훈).
