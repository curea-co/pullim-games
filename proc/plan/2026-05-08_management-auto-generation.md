# 관리 페이지 자동 생성 재설계 (Management — Auto-Generation)

DRAFT · 2026-05-08

## 0. 컨텍스트 및 이전 plan 폐기 사유

이전 plan `2026-05-08_management-redesign.md` (archived, 커밋 `2793f7f`) 는 사용자가 자료를 textarea 에 붙인 뒤 rule-based parser 로 변환하는 방식이었다. 단, 사용자가 형식 마커 (`정답::뜻`, `Q: ... / A) ... / 정답: A`, `[정답|오답1|오답2|오답3]`) 를 직접 작성·삽입해야 했다.

사용자 피드백 (2026-05-08): "사용자가 과목, 단원 또는 사용자가 가진 자료만 넣으면 게임 타입에 따라서 알아서 만들어져야 한다고… 다시 기획해. 왜 텍스트 채워넣는 쓸데 없는 기획을 한거야"

→ 기존 plan 폐기. 사용자에게 형식을 강요하지 않는 진짜 자동 생성 으로 재설계.

## 1. 제품 의도

게임 카드를 만들기 위한 사용자 입력은 단 두 가지:

- **Mode A — 과목/단원 picker** (교육과정 seed 기반)
- **Mode B — 자료 paste** (비구조 텍스트, 형식 X)

게임 타입 (typing / word-match / multiple-choice / blank) 별로 시스템이 알아서 카드를 추출/생성한다. 사용자는 형식, 마커, 구분자를 알 필요가 없다.

## 2. UX 흐름

### 2.1 진입

`/manage/content` → "게임 만들기" 단일 화면. 게임 타입 (4가지) 선택 → 입력 모드 (A/B) 토글.

### 2.2 Mode A — 교육과정 기반

```
1. 게임 타입 선택  [객관식 | 빈칸 | 타이핑 | 매칭]
2. 과목 선택       [영어 | 수학 | 국어 | 사회 | 과학 ...]   ← cascade
3. 단원 선택       [인수분해 | ... ]                         ← cascade
4. 카드 수 (옵션)  [10 | 20 | 30]
5. [생성] 버튼
   ↓
6. 생성된 카드 preview (PreviewCard 재사용)
7. 체크박스로 일부 제외 가능 + inline 편집
8. [저장]
```

### 2.3 Mode B — 자료 paste

```
1. 게임 타입 선택
2. 자료 paste (자유 텍스트, 형식 무관)
   - 본문, 단어 리스트, 강의 노트, 교과서 일부 등 OK
   - 글자수만 표시 (제약은 토큰 한계 안내만)
3. 카드 수 (옵션)
4. [생성] 버튼
   ↓ (LLM 호출)
5. 생성 중 spinner + cancel
6. 생성된 카드 preview
7. 체크박스/편집/저장
```

## 3. 기술 아키텍처

### 3.1 Mode A — Curriculum-based Seed

- `src/lib/core/curriculum/seed/{subjectId}/{unitId}.json` — 큐레이션된 raw material
- 게임 타입별 변환기가 seed 의 적절한 sub-collection 에서 카드 생성
- 변환기는 순수 함수, side-effect 없음

`seed/{unit}.json` 구조 (제안):
```json
{
  "subjectId": "math",
  "unitId": "factorization",
  "displayName": "인수분해",
  "vocabulary": [
    {"term": "공통인수", "meaning": "여러 식에 공통으로 들어 있는 인수"}
  ],
  "pairs": [
    {"left": "x²-1", "right": "(x+1)(x-1)"}
  ],
  "quizzes": [
    {"question": "...", "choices": ["A","B","C","D"], "correctIndex": 1, "rationale": "..."}
  ],
  "passages": [
    {"passage": "... ___ ...", "answer": "공통인수", "distractors": ["인수","약수","배수"]}
  ]
}
```

게임 타입 → seed sub-collection 매핑:
- `typing` ← `vocabulary` (term/meaning)
- `word-match` ← `pairs`
- `multiple-choice` ← `quizzes`
- `blank` ← `passages`

V1 seed 범위: **인수분해 1단원만**. 영어/국어 seed 는 별도 plan 으로 점진 확장.

### 3.2 Mode B — LLM Auto-Extraction

- Provider: **Anthropic Claude API** (`@anthropic-ai/sdk`)
- Model: `claude-haiku-4-5-20251001` (속도 + 비용)
- 호출 위치: **Server Action** `src/app/manage/content/actions.ts`
- API key: `process.env.ANTHROPIC_API_KEY` (배포 env, 사용자 로컬은 `.env.local`)

Server Action 흐름:
```
client → generateCardsAction({kind, sourceText, count})
       ↓
       buildPrompt(kind) + sourceText
       ↓
       anthropic.messages.create({system, messages, tools: [JSON schema]})
       ↓
       parse tool_use response → validate → return DraftCard[]
       ↓
client renders PreviewCard list
```

**Structured output**: Anthropic tool-use 로 강제. 게임 타입별 JSON schema 정의:
- `extractTypingCards` → `{cards: [{answer, meaning, pronunciation?}]}`
- `extractWordMatchCards` → `{cards: [{left, right}]}`
- `extractMultipleChoiceCards` → `{cards: [{question, choices[4], correctIndex}]}`
- `extractBlankCards` → `{cards: [{passage, choices[4], correctIndex, rationale?}]}`

**Prompt 전략** (한국어 + 영어 혼용 OK):
- system: "당신은 학습 카드 자동 생성기입니다. 주어진 자료에서 [게임 타입] 카드를 정확히 N장 추출/생성하세요. 자료에 명시되지 않은 사실은 만들어내지 마세요."
- user: 자료 전체 + 카드 수 + 게임 타입별 추가 가이드

**에러 처리**:
- API 실패 → "지금은 자동 생성이 어려워요. 잠시 후 다시 시도해주세요." + retry 버튼
- JSON 파싱 실패 → 1회 retry, 그래도 실패하면 위 메시지
- Rate limit → 동일 처리 + "조금 후 다시" 안내

### 3.3 Schema 호환성

생성된 카드는 기존 `CustomCard` 타입과 동일 (이전 plan 의 schema 그대로 활용). Mode A/B 둘 다 같은 `CustomCard` 로 변환 → preview/save 경로 통일.

## 4. 컴포넌트 설계

### 4.1 신규

| 파일 | 책임 |
|---|---|
| `src/components/manage/auto/ModeToggle.tsx` | Mode A/B 전환 |
| `src/components/manage/auto/CurriculumPicker.tsx` | 과목 → 단원 cascade |
| `src/components/manage/auto/RawMaterialInput.tsx` | 자유 텍스트 paste (형식 안내 X) |
| `src/components/manage/auto/GenerateButton.tsx` | 생성 트리거 + 카드 수 선택 |
| `src/components/manage/auto/GenerationProgress.tsx` | spinner + cancel + 에러 메시지 |
| `src/lib/core/curriculum/seed/math/factorization.json` | V1 단일 seed |
| `src/lib/core/curriculum/seed-loader.ts` | seed 디렉토리 walk + 메타 노출 (subject/unit list) |
| `src/lib/core/curriculum/converters.ts` | seed → DraftCard 변환 (4 게임 타입) |
| `src/app/manage/content/actions.ts` | Server Action: `generateFromCurriculum`, `generateFromSource` (LLM) |
| `src/lib/server/ai/anthropic.ts` | Anthropic client + tool schemas + prompt builders |

### 4.2 재사용

- `PreviewCard.tsx` — 생성 결과 preview/편집/삭제 (이전 plan 산출물 그대로)
- `CustomCardStore` — preview 후 일괄 저장 경로 동일

### 4.3 폐기

- `src/components/manage/bulk/BulkSourceInput.tsx` (형식 강요 textarea)
- `src/components/manage/bulk/SourceFormatGuide.tsx` (형식 안내 자체가 의미 없음)
- `src/lib/core/custom/parsers.ts` (rule-based parsers)
- `src/lib/core/custom/parsers.test.ts` (해당 18개 테스트)

폐기 이유: Mode A 는 seed 직접 변환, Mode B 는 LLM JSON 결과만 파싱. 사용자 형식 강요 코드 경로 전부 제거.

## 5. 페이지 재설계

`src/app/manage/content/page.tsx` 흐름:

```tsx
1. 게임 타입 선택 (4 타일)
2. ModeToggle (A: 교육과정 / B: 자료)
3. {mode === 'A' ? <CurriculumPicker /> : <RawMaterialInput />}
4. <GenerateButton count />
5. (생성 중) <GenerationProgress />
6. (생성 완료) <PreviewCard /> 리스트 + 일괄 저장
```

좌측 sidebar 의 4 메커닉 sub-route (`/manage/content/typing` 등) 는 유지 — 진입점만 다르고 내부 흐름 동일.

## 6. 의존성 추가

- `@anthropic-ai/sdk` — `bun add @anthropic-ai/sdk`
- env: `ANTHROPIC_API_KEY` (Vercel project setting + 로컬 `.env.local` 안내)
- `.env.example` 에 `ANTHROPIC_API_KEY=sk-ant-...` 항목 추가

## 7. 비용 / Rate limit / 보안

- V1: 학생 1명 가정. Haiku 호출 수 무시 가능 (한 호출당 ~$0.001 추정)
- Server Action 으로 호출 → API key 클라이언트 노출 0
- V2 plan (별도): per-user rate limit, BYO API key, doc 업로드, 비용 모니터링

## 8. 단계별 구현

### Phase 1 — 이번 plan 범위

- [ ] `@anthropic-ai/sdk` 추가 + `.env.example` 업데이트
- [ ] `seed/math/factorization.json` 큐레이션 (인수분해 vocabulary 10+, pairs 10+, quizzes 5+, passages 5+)
- [ ] `seed-loader.ts` + `converters.ts` (4 게임 타입)
- [ ] `anthropic.ts` (client + 4 tool schema + prompt builder)
- [ ] Server Action `generateFromCurriculum`, `generateFromSource`
- [ ] UI: `ModeToggle`, `CurriculumPicker`, `RawMaterialInput`, `GenerateButton`, `GenerationProgress`
- [ ] `manage/content/page.tsx` 재작성 (Mode A/B 통합)
- [ ] 폐기 파일 4개 삭제 (BulkSourceInput, SourceFormatGuide, parsers.ts, parsers.test.ts)
- [ ] PreviewCard 재사용 검증
- [ ] 테스트: converters 단위 테스트 (seed → DraftCard 4 타입), Anthropic mock 테스트 (tool_use response → DraftCard)

### Phase 2 — 별도 plan

- 추가 단원 seed (영어 어휘 lesson 1, 국어 작품 등)
- 사용자 BYO API key
- doc/PDF 업로드
- per-user rate limit
- 한국어/영어 prompt 정확도 측정 (eval set)

## 9. 검증 기준 (Phase 1 완료 조건)

- [ ] Mode A: 과목=수학, 단원=인수분해 선택 → 4 게임 타입 모두 N장 생성 가능
- [ ] Mode B: 임의 영어 본문 paste → 4 게임 타입 모두 N장 생성 가능
- [ ] 사용자가 어떤 형식도 학습할 필요 없음 (UI에 마커/구분자 안내 0)
- [ ] 생성 후 PreviewCard 에서 편집/삭제/일괄 저장 가능
- [ ] 저장된 카드로 게임 정상 플레이
- [ ] `bun run typecheck` 0 error
- [ ] `bun run lint` 0 warning
- [ ] `bun run test` 100% green (parser 테스트 18 제거 + converter 테스트 신규 추가)
- [ ] `bun run build` 성공
- [ ] `/manage/content` 200 응답
- [ ] LLM 호출 실패 시 에러 메시지 정상 표시

## 10. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| API key 미설정 환경 | Mode B 동작 X | env check → 친절한 안내 ("관리자에게 API 키 설정 요청") |
| LLM JSON 파싱 실패 | 생성 실패 | tool-use 강제 + 1회 retry + 사용자에게 재시도 버튼 |
| Haiku 의 한국어 품질 | 부정확한 카드 | preview/편집 단계에서 사용자가 보정 가능, V2 에서 모델 비교 |
| Vercel 환경변수 미적용 | 배포 후 Mode B 죽음 | deploy 직후 헬스체크 (Mode B 1회 호출) 절차 추가 |
| 비용 폭주 | 학생 다수 가정 시 청구 | V2 rate limit + BYO 도입 전까지 V1 호출 수 텔레메트리 |

## 11. 결정 (한 번에 가는 갈래들)

- LLM provider: **Claude (Anthropic)** — Korean 강함 + tool-use 안정적
- Model: **claude-haiku-4-5-20251001** — 속도/비용 우선, 품질 부족 시 sonnet 으로 fallback (V2)
- API key: **V1 환경변수 (운영자 제공)**, V2 BYO
- Seed 우선: **인수분해 1단원** — 기존 게임 자산 일치 + 검증 빠름
- 입력 모드: **A/B 양립** — 둘 다 V1 에서 작동해야 함

## 12. 진행 순서

1. 본 plan 사용자 승인
2. 의존성 추가 + env 안내
3. seed JSON 큐레이션
4. converters + seed-loader + 단위 테스트
5. Anthropic client + tool schemas + prompt
6. Server Actions (mock LLM 테스트 포함)
7. UI 컴포넌트 (ModeToggle/CurriculumPicker/RawMaterialInput/GenerateButton/GenerationProgress)
8. page.tsx 재작성
9. 폐기 4 파일 삭제
10. typecheck/lint/test/build 통과
11. /manage/content 수동 검증 (Mode A 1회, Mode B 1회)
12. 커밋 + push + Vercel 환경변수 설정 안내
13. 본 plan archive
