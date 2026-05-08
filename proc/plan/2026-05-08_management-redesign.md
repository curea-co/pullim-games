# 관리 — 게임 생성 재기획 (자료 → 자동 변환)

- **작성일**: 2026-05-08
- **상태**: DRAFT (사용자 검토 후 APPROVED → 개발 진입)
- **분량**: L
- **선행**: `proc/archive/plan/2026-05-08_management.md` (기존 — 사용자 의도 위반, 본 plan 으로 핵심 흐름 대체)
- **결론 한 줄**: **사용자가 4지선다 문제 자체를 손으로 입력하면 학습 가치 0 (자기가 만든 답을 자기가 보는 retrieval 0). 입력 단위를 "문제" → "**자료**" 로 바꾼다. 사용자는 본문·어휘 리스트·문제집 텍스트 같은 **원본 자료**를 넣고, 시스템이 메커닉별 카드로 자동 변환. V0.5 = 룰 기반 파싱 + 일괄 입력. AI 자동 추출은 V0.6+.**

---

## 1. 기존 구현의 근본 문제

`proc/archive/plan/2026-05-08_management.md` 결과:
- 사용자가 객관식·빈칸·타이핑·매칭 카드를 한 장씩 직접 입력
- 질문 입력 → 보기 4개 입력 → 정답 체크 → 저장
- 그 후 사용자가 자기가 만든 카드를 풀이

**사용자 평가**:
> "구성 자체가 게임=문제 처럼 구성되어있는데, 사용자가 문제를 만들고 문제를 푸는건 말이 안돼"

**핵심 모순**:

retrieval practice = 답을 모르는 상태에서 끄집어내기. **사용자가 직접 만든 카드는 답을 이미 안다** → 풀이는 단순 입력 반복, 학습 효과 0.

→ **입력 단위 자체가 잘못됨**. 사용자에게 "문제를 만들어주세요" 라고 요구하는 것 자체가 풀림 게임즈 핵심 원칙 (학습 효과 우선) 위반.

---

## 2. 사용자 의도 재해석

사용자가 원하는 사용 시나리오 (재구성):

> "내 영어 단어장에 있는 어휘 100개를 풀림 게임즈에서 풀고 싶어"
> "수능특강 빈칸 문제 50개를 풀고 싶어"
> "내 한자 노트의 한자 200개를 타이핑 게임에서 외우고 싶어"
> "내가 가진 객관식 문제집을 풀고 싶어"

→ 사용자는 **자료 (원본)** 를 가지고 있다. 그걸 **풀이용 카드** 로 변환하는 건 시스템의 일.

→ retrieval practice 가 작동하려면:
- 사용자가 **자료를 모은다** (원본 자료를 읽으면서 한 번 인지)
- 시스템이 **카드로 변환** (어떤 단어를 빈칸으로? 어떤 보기를 만들지?)
- 사용자가 **다시 푼다** (카드 형태로 만나면 자료 인지 시점과 다른 retrieval)

키 포인트: **자료 인지 시점 ↔ 풀이 시점** 사이에 시스템 변환이 들어가서 사용자가 답을 직접 만들지 않음.

---

## 3. 목표

1. **입력 단위 = 자료 (원본 텍스트)** — 카드가 아님
2. **시스템 자동 변환** — 메커닉별로 카드 자동 생성
3. **변환 결과 사용자 검토 가능** — 자동 생성이 100% 정확하지 않으니 수정·삭제·일부 채택 옵션
4. **V0.5 = 룰 기반** — AI 의존 X, 텍스트 파싱·구조화된 입력
5. **V0.6+ = AI 자동 추출** — 별도 plan, 본 plan 은 schema 만 호환
6. **사용자 자료 입력 friction 최소** — CSV / 한 줄 패턴 / 본문 직접

## 4. 비목표

- AI 자동 카드 생성 (V0.6+ AI 인프라 plan, 별도)
- OCR (이미지 → 텍스트) — V0.7+
- PDF 직접 import — V0.7+
- 다른 사용자 자료 공유 — V1.0+

---

## 5. 자료 → 카드 변환 매트릭스

| 자료 형태 | 메커닉 | V0.5 변환 방식 |
|---|---|---|
| 어휘 리스트 (한자/영단어) | typing | 한 줄에 `정답::뜻` 또는 `정답<TAB>뜻` 형식 → 자동 |
| 짝 리스트 (영-한, 한자-음 등) | matching | 한 줄에 `왼쪽<TAB>오른쪽` → 4-8 짝씩 카드 묶음 |
| 객관식 문제 (구조화 텍스트) | multiple-choice | 명시 형식 (`Q: ...\nA) ...\nB) ...\n정답: B`) → 파싱 |
| 본문 + 빈칸 위치 | blank | 본문에 `[정답:보기1|보기2|보기3]` 마커 → 빈칸 카드 |
| **자유 본문** | blank | **V0.5 미지원** — V0.6+ AI 추출 (본 plan §11 NOT in scope) |

→ V0.5 는 **사용자가 입력 형식을 따르면 자동 카드 생성**. AI 없이도 작동.

→ V0.6+ AI plan 에서는 자유 본문 → 자동 빈칸 위치 추출, 어휘 리스트 → 자동 4지선다 보기 생성 등 추가.

---

## 6. UX 재설계 (`/manage/content` 교체)

### 6.1 기존 → 신규

| 기존 | 신규 |
|---|---|
| 메커닉 선택 → 과목/단원 → form 입력 (질문/보기) → 저장 | 메커닉 선택 → 과목/단원 → **자료 붙여넣기** → 미리보기 → 일괄 저장 |
| 카드 1장 = 입력 1번 | **자료 1번 = 카드 N장 자동** |
| 입력 시간 큼 (5장 = 5번 form) | 시간 작음 (30 카드를 한 번에 붙여넣기 가능) |

### 6.2 화면 IA

```
┌──────────────────────────────────────┐
│ 자료 추가                             │
│ 1. 메커닉 (객관식/빈칸/타이핑/매칭)   │
│ 2. 과목·단원                          │
│ 3. 자료 붙여넣기                      │
│   ┌─ 입력 형식 안내 (메커닉별) ──┐   │
│   │ 한 줄에 `정답::뜻`             │   │
│   │ 예: 模範::본보기              │   │
│   └────────────────────────────┘   │
│   ┌─ 자료 textarea (큼지막) ─────┐  │
│   │                                │  │
│   │ ...                            │  │
│   └────────────────────────────────┘  │
│ 4. 미리보기 (자동 변환된 카드 N장)    │
│   - 각 카드 수정·삭제·체크 토글        │
│ 5. [선택된 N장 저장]                   │
└──────────────────────────────────────┘
```

### 6.3 메커닉별 입력 형식

#### 6.3.1 typing (어휘 타이핑)

**형식**: 한 줄에 `정답::뜻` (또는 `정답	뜻` TAB 분리)

```
모순::앞뒤가 서로 맞지 않는 일
일거양득::한 가지 일로 두 가지 이익
절치부심::이를 갈며 마음을 썩임
```

→ 줄별로 카드 1장 자동 생성.

옵션: 한 줄에 3 컬럼 = `정답::뜻::한자표기` (한자 표기 보조).

#### 6.3.2 matching (짝 매칭)

**형식**: 한 줄에 `왼쪽::오른쪽` (또는 TAB 분리)

```
pursue::추구하다
contradict::모순되다
perceive::인식하다
distinguish::구별하다
regulate::조절하다
integrity::진실성
prejudice::편견
dilemma::딜레마
```

→ 4-8개 짝씩 카드 1장. 8개 입력 = 카드 1장 (8 짝). 16개 입력 = 카드 2장 (8씩 분할). 4-8 사이는 1장.

#### 6.3.3 multiple-choice (객관식)

**형식**: 블록 단위 (빈 줄로 구분):

```
Q: 2x + 4 의 인수분해는?
A) x(2 + 4)
B) 2(x + 2)
C) 2x + 4
D) (x+2)(x-2)
정답: B

Q: x² + 5x + 6 의 인수분해는?
A) (x+2)(x+3)
B) (x+1)(x+6)
C) (x-2)(x-3)
D) x(x+5)+6
정답: A
```

→ 블록 1개 = 카드 1장. 정확한 형식 강제 (Q:, A) ~ D), 정답:).

#### 6.3.4 blank (빈칸 추론)

**형식**: 본문에 `[정답|오답1|오답2|오답3]` 마커

```
Reading widely is one of the most effective ways to improve your vocabulary. The more you read, the more new words you [encounter|ignore|remember|copy], often without even noticing.

Many scientists once believed that emotions were [opposed|related|similar|identical] to logical thinking.
```

→ 단락 단위 (빈 줄로 구분). 마커가 보기 4개 — 첫 항목이 정답.

옵션: rationale 추가 — 단락 끝에 `해설: ...` 라인.

### 6.4 미리보기 + 검토

자료 붙여넣기 후:
- 자동 변환 결과를 카드 N장 리스트로 표시
- 각 카드:
  - 체크박스 (선택/해제) — 기본 모두 선택
  - 미리보기 콘텐츠 (질문/보기/정답 강조)
  - **편집 버튼** — 자동 변환이 틀렸을 때 직접 수정
  - 삭제 버튼
- 파싱 실패 라인은 별도 표시 (라인 번호 + 사유)
- "선택된 N장 저장" — 한 번 클릭으로 일괄

### 6.5 빈 상태 / 첫 사용 가이드

자료 입력 영역에 메커닉별 안내:
```
타이핑 카드 만들기

📋 형식: 한 줄에 정답::뜻

✏️ 예시:
모순::앞뒤가 서로 맞지 않는 일
일거양득::한 가지 일로 두 가지 이익

📌 팁:
- 한 줄 = 카드 1장
- TAB 으로 구분해도 OK
- 한자 표기 추가: 정답::뜻::한자표기

[ 예시 자료 채우기 → ]  (클릭 시 textarea 에 예시 자동 입력)
```

### 6.6 편집 폐기

기존 단일 카드 입력 form (MultipleChoiceForm 등) 폐기.
- 다만 미리보기에서 "편집" 버튼 클릭 시 inline 편집 form 으로 fallback (예외 케이스 — 1-2 장 수정용)

---

## 7. 데이터 변환 로직 (V0.5 룰 기반)

### 7.1 typing 파서

```ts
function parseTypingSource(text: string): {
  cards: Array<Partial<CustomTypingCard>>;
  errors: { line: number; message: string }[];
} {
  const lines = text.split("\n").filter((l) => l.trim());
  const cards: Array<Partial<CustomTypingCard>> = [];
  const errors: { line: number; message: string }[] = [];

  lines.forEach((line, i) => {
    const parts = line.includes("::")
      ? line.split("::").map((p) => p.trim())
      : line.split("\t").map((p) => p.trim());
    if (parts.length < 2) {
      errors.push({ line: i + 1, message: "정답::뜻 형식이 아니에요" });
      return;
    }
    cards.push({
      kind: "typing",
      answer: parts[0],
      meaning: parts[1],
      pronunciation: parts[2] || undefined,
    });
  });
  return { cards, errors };
}
```

### 7.2 matching 파서

```ts
function parseMatchingSource(text: string, pairsPerCard = 5): {
  cards: Array<Partial<CustomWordMatchCard>>;
  errors: ...;
} {
  // 줄별 좌::우 추출 → pairsPerCard 개씩 묶어 카드
}
```

기본 묶음 = 5 짝/카드. 사용자 옵션으로 4~8 사이 변경 가능.

### 7.3 multiple-choice 파서

```ts
function parseMultipleChoiceSource(text: string): { cards, errors } {
  // 빈 줄로 블록 분할 → 각 블록 Q:/A)~D)/정답: 추출
  // 정답이 A~D 중 하나여야 함, 보기 4개 강제
}
```

엄격한 파싱 — 형식 어긋나면 errors 에 라인·사유.

### 7.4 blank 파서

```ts
function parseBlankSource(text: string): { cards, errors } {
  // 빈 줄로 단락 분할 → [정답|오답1|오답2|오답3] 마커 찾기
  // 마커 1개 강제 (V0.5: 단락당 빈칸 1개)
  // 보기 4개 강제, 첫 항목 = 정답
}
```

### 7.5 src/lib/core/custom/parsers.ts (신규)

위 4 파서를 lib/core 에 추가. 단위 테스트로 검증.

→ ⚠️ **lib/core 변경**: parsers.ts 신규 (read-only 계약 준수, 다른 게임 영향 0).

---

## 8. AI 미리보기 (V0.6+ 호환 슬롯)

본 plan 의 schema 는 V0.6+ AI 추출 결과와 동일.

V0.6+ AI plan 에서는:
```
사용자가 자유 본문 입력
  → AI 호출 (OpenAI/Claude API)
  → AI 가 빈칸 위치 + 보기 4개 추출
  → 동일 schema 의 BlankCard
  → 미리보기 → 사용자 검토 → 저장
```

본 plan UI 는 그대로 — `자료 입력 → 변환 → 미리보기 → 저장` 흐름. 변환 단계만 V0.5 룰 기반 → V0.6 AI 로 교체.

---

## 9. 컴포넌트 변경

### 9.1 폐기

- `MultipleChoiceForm.tsx`
- `BlankForm.tsx`
- `TypingForm.tsx`
- `WordMatchForm.tsx`

(미리보기 inline 편집은 별도 가벼운 form 으로 대체 — 기존 4 form 의 단순화 버전)

### 9.2 신규 (`src/components/manage/`)

```
manage/
  bulk/
    BulkSourceInput.tsx           # 자료 textarea + 형식 안내
    SourceFormatGuide.tsx         # 메커닉별 안내 (예시 자동 채우기)
    PreviewList.tsx               # 변환 결과 리스트 (체크박스 + 편집 + 삭제)
    PreviewCard.tsx               # 카드 1개 미리보기 + inline 편집
    BulkSaveBar.tsx               # 하단 sticky "선택된 N장 저장"
```

### 9.3 src/lib/core/custom/parsers.ts 신규

4 메커닉 파서 + 단위 테스트.

### 9.4 src/app/manage/content/page.tsx 재작성

기존 단일 카드 입력 → 일괄 입력 워크플로우.

---

## 10. 단계별 구현

### Phase MR1 — 파서 4개 + 단위 테스트 (1일)
- [ ] `src/lib/core/custom/parsers.ts` 신규
  - parseTypingSource / parseMatchingSource / parseMultipleChoiceSource / parseBlankSource
- [ ] 각 메커닉 단위 테스트 (정상 + edge case + 형식 오류)
- [ ] lib/core 메인 barrel export

### Phase MR2 — 컴포넌트 신규 (1일)
- [ ] `BulkSourceInput` — 자료 textarea + 메커닉별 placeholder
- [ ] `SourceFormatGuide` — 형식 안내 + 예시 자동 채우기 버튼
- [ ] `PreviewList` + `PreviewCard` — 변환 결과 + 인라인 편집 + 체크박스
- [ ] `BulkSaveBar` — sticky 하단 "선택된 N장 저장"

### Phase MR3 — 페이지 재작성 (0.5일)
- [ ] `/manage/content/page.tsx` 재작성
- [ ] 메커닉 선택 → 과목/단원 → 자료 → 미리보기 → 저장 흐름
- [ ] 기존 4 form 컴포넌트 폐기

### Phase MR4 — 검증 (0.5일)
- [ ] typecheck / lint / test
- [ ] dev: 4 메커닉 자료 입력 → 변환 → 검토 → 저장 → 게임 풀이 cycle
- [ ] 형식 오류 시 안내 정확
- [ ] 기존 카드 (단일 입력으로 만든) 호환 — schema 동일

**총: 3일.**

---

## 11. 검증 기준

- [ ] 4 메커닉 모두 자료 일괄 입력 → 카드 N장 자동 생성
- [ ] 미리보기에서 카드별 체크/해제, 편집, 삭제 동작
- [ ] 파싱 오류 라인 표시 + 사유
- [ ] "예시 자료 채우기" 버튼 동작 → 형식 자동 학습
- [ ] 저장 후 카드 풀에 추가 → custom-* 게임에서 풀이
- [ ] 본 게임 4개 동작 변경 0
- [ ] schema 호환 — 기존 단일 입력 카드 + 일괄 입력 카드 동일하게 풀이 가능
- [ ] typecheck / lint / test / build 통과

---

## 12. NOT in scope

- AI 자동 추출 (자유 본문 → 빈칸/객관식 자동 생성) — V0.6+ AI 인프라 plan
- OCR (이미지 → 텍스트) — V0.7+
- PDF 직접 import — V0.7+
- 다른 사용자 자료 공유 — V1.0+
- manipulation·sorting 메커닉 자료 변환 — V0.7+ (텍스트만으로 매핑 어려움)

---

## 13. 결정 (확정)

1. ✅ **입력 단위 = 자료 (원본 텍스트)** — 사용자가 카드를 직접 만들지 않음
2. ✅ **V0.5 룰 기반 파싱** — AI 없음, 사용자 입력 형식 명시
3. ✅ **메커닉별 입력 형식 4종** — typing/matching `::` 또는 TAB / multiple-choice 블록 / blank `[정답|오답들]`
4. ✅ **미리보기 + 검토 + 일괄 저장** — 자동 변환 후 사용자 검토 단계
5. ✅ **인라인 편집 fallback** — 자동 변환 부정확 시 수정
6. ✅ **schema 호환 V0.6+** — AI 결과도 동일 schema, UI 만 변환 단계 교체
7. ✅ **기존 4 form 폐기** — 카드 단위 입력 자체가 사용자 의도 위반

---

## 14. 다음 단계

1. 본 plan 검토
2. APPROVED 시 MR1~MR4 진입
3. V0.6+ AI 추출 plan 별도 작성 시점 검토
