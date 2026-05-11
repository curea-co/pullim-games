# 관리 페이지 (`/manage`)

- **작성일**: 2026-05-08
- **상태**: DRAFT (사용자 검토 후 APPROVED → 개발 진입)
- **분량**: XL (가장 큰 plan — V0.5 의 핵심 가치 확장)
- **선행 의존**:
  - `2026-05-08_nav-ia-restructure.md` (`/manage` 라우트)
  - `2026-05-08_game-hub.md` (나만의 게임 영역 자리)
- **결론 한 줄**: **사용자가 자기 과목·교육과정·콘텐츠(문제·본문 텍스트) 를 입력해 기존 메커닉 위에 카드를 올려 "나만의 게임"을 만드는 워크스페이스. V0.5 는 호환 가능한 메커닉 (multiple-choice / blank / typing / matching) 만 지원. manipulation·sorting 메커닉 커스텀은 V0.6+.**

---

## 1. 배경 및 사용자 명시 요구

> "관리는 게임에 적용시킬 과목의 정보를 넣는 공간이야. 교육과정에 해당하는 내용을 설정하거나, 사용자가 가진 정보(문제(텍스트), 본문(텍스트) 등)를 넣어서 게임을 커스텀할 수 있어야 해."

핵심 4가지:
1. 과목 정보 입력
2. 교육과정 (단원·차시) 매핑
3. 사용자 콘텐츠 (문제·본문 텍스트) 입력
4. 위 정보로 기존 게임 메커닉 위에 **나만의 카드** 생성 → 게임 허브에 노출

이건 단순 기능 추가가 아니라 **풀림 게임즈가 "공식 콘텐츠 소비 도구"에서 "사용자가 자기 학습 콘텐츠를 넣어 푸는 도구"로 격이 바뀌는 변경**. V0.5 의 핵심 가치 확장.

---

## 2. 목표

1. **콘텐츠 자가 입력** — 사용자가 자기 시험·문제집·필기노트의 텍스트를 넣어 카드화
2. **메커닉 재활용** — 기존 5종 메커닉 위에 사용자 콘텐츠 얹기 (문제 → 카드 schema)
3. **수직 IA** — 과목 → 교육과정 (단원·차시) → 콘텐츠 (카드) 3-tier
4. **Local-first** — V0.5 는 모든 데이터 localStorage 저장 (V0.6+ 동기화 plan)
5. **나만의 게임 자동 생성** — 사용자 콘텐츠 입력 후 별도 빌드 없이 게임 허브에 노출
6. **메커닉 호환성 명시** — 어떤 메커닉이 텍스트 입력만으로 커스텀 가능한지 명확

## 3. 비목표

- AI 자동 카드 생성 (텍스트 → 문제 자동 변환) — V0.7+ AI 인프라 plan
- 이미지 / 수식 / 동영상 콘텐츠 — V0.6+ (텍스트만으로 V0.5)
- 다른 사용자와 콘텐츠 공유 — V1.0+ (개인 정보·저작권 검토 후)
- manipulation 메커닉 커스텀 (factorization, chemistry-balance, math-graph-shift, physics-vector) — V0.6+ 별도 plan
  - 이유: manipulation 은 단순 텍스트 → 카드 매핑 불가. AST 변환·공간 좌표 등 도메인 로직 필요
- sorting 커스텀 (history-timeline, english-order) — V0.6+ (사건 + 연도 입력 또는 단어 토큰 입력 UX 별도 검토)
- 학년·시험 일정 매핑 — V0.6+

---

## 4. 데이터 모델

### 4.1 3-tier 계층

```
Subject (과목)
  └── Curriculum (교육과정 — 단원/차시)
       └── CustomCard (사용자 카드)
            └── attached to → Game Mechanic (호환 메커닉만)
```

### 4.2 Subject 스키마

```ts
type CustomSubject = {
  id: string;                  // uuid
  name: string;                // "수능 수학", "내 영어 단어장" 등
  iconKey?: string;            // lucide 이름 (선택, 기본 BookOpen)
  color?: string;              // hex (선택, 기본 jade)
  createdAt: Date;
  updatedAt: Date;
};
```

기본 제공 과목 (시드): 없음. 사용자가 직접 만든 과목만.
이유: 풀림 게임즈 공식 게임의 과목 (수학·영어·국어·사회·과학) 과 사용자 과목을 분리. 충돌 회피.

### 4.3 Curriculum 스키마

```ts
type CustomCurriculum = {
  id: string;
  subjectId: string;
  name: string;                // "고2 통합영어 1단원" 등
  parentId?: string;           // 트리 구조 (단원 → 차시 → 소단원)
  order: number;               // 정렬 순서
  createdAt: Date;
  updatedAt: Date;
};
```

트리 구조 — 사용자가 자유 깊이 (단원 → 차시 → 소단원 → 더 깊이)로 입력 가능. V0.5 는 깊이 제한 X (UI 가 트리 자동 들여쓰기).

### 4.4 CustomCard 스키마

```ts
type CustomCardKind = "multiple-choice" | "blank" | "typing" | "word-match";

type CustomCardBase = {
  id: string;
  subjectId: string;
  curriculumId: string;
  kind: CustomCardKind;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  createdAt: Date;
  updatedAt: Date;
};

type MultipleChoiceCard = CustomCardBase & {
  kind: "multiple-choice";
  question: string;
  choices: string[];           // 4개 (UX 제약)
  correctIndex: number;
};

type BlankCard = CustomCardBase & {
  kind: "blank";
  passage: string;             // ___ 토큰 포함
  choices: string[];           // 4개
  correctIndex: number;
  rationale?: string;
};

type TypingCard = CustomCardBase & {
  kind: "typing";
  meaning: string;             // 뜻풀이
  answer: string;              // 정답 텍스트
  pronunciation?: string;
};

type WordMatchCard = CustomCardBase & {
  kind: "word-match";
  pairs: { left: string; right: string }[]; // 4-8개
};
```

### 4.5 V0.5 호환 메커닉

| 게임 메커닉 | 텍스트만으로 커스텀? | V0.5 지원 |
|---|---|---|
| multiple-choice | ✅ (math-quick-quiz / english-blank 패턴) | ✅ |
| typing | ✅ (vocab-typing 패턴) | ✅ |
| matching | ✅ (english-word-match 패턴) | ✅ |
| sorting | ⚠️ 가능하지만 토큰 단위 입력 UX 복잡 (english-order / history-timeline) | ❌ V0.6+ |
| manipulation | ❌ 도메인 로직 필요 (AST·계수·좌표) | ❌ V0.6+ |

**V0.5 = 4 kind 만 지원**. UI 에 메커닉 호환성 명시 ("이 메커닉은 텍스트만으로 만들 수 있어요").

### 4.6 Storage

```
localStorage:
  pullim-games:custom:subjects        → CustomSubject[]
  pullim-games:custom:curriculum      → CustomCurriculum[]
  pullim-games:custom:cards           → CustomCard[]
```

JSON 직렬화. Date 는 ISO string 으로 저장 → load 시 변환.

`src/lib/core/storage/custom.ts` 신규 (lib/core 추가).

→ ⚠️ **lib/core 변경**: 단일 파일 추가. Plan R §5.4 read-only 계약 준수, 다른 게임 영향 0.

### 4.7 export / import

V0.5 후반:
- 사용자가 자기 데이터를 JSON 파일로 export
- 다른 디바이스에서 import
- 멀티 디바이스 백업 수단 (V2 SSO 전까지)

→ Phase M5 에서 다룸.

---

## 5. UX 설계

### 5.1 페이지 구조 (4-section)

```
/manage                    → 관리 홈 (대시보드)
/manage/subjects           → 과목 관리 (CRUD)
/manage/curriculum         → 교육과정 관리 (트리 CRUD)
/manage/content            → 콘텐츠 입력 (카드 CRUD)
/manage/custom-games       → 나만의 게임 (메커닉 × 콘텐츠 매핑 미리보기)
```

### 5.2 관리 홈 (`/manage`)

- 과목 N개 / 단원 N개 / 카드 N개 통계
- 빠른 진입: "과목 추가" / "카드 추가" / "내 게임 보기"
- 빈 상태: "첫 과목을 만들어 보세요" + 가이드 4단계 안내
  1. 과목 만들기
  2. 교육과정 (단원) 만들기
  3. 카드 입력
  4. 나만의 게임 풀기

### 5.3 과목 관리 (`/manage/subjects`)

- 좌: 내 과목 리스트 (이름·아이콘·카드 수)
- 우: 선택한 과목의 detail (이름·색·아이콘 편집)
- 액션: 추가 / 편집 / 삭제 (확인 dialog)

### 5.4 교육과정 관리 (`/manage/curriculum`)

- 좌: 트리 (과목 → 단원 → 차시 → ...)
  - 펼침/접힘 토글
  - 드래그로 순서 변경 (V0.6+, V0.5 는 위/아래 화살표 버튼)
- 우: 선택한 노드 detail (이름·부모 변경)
- 액션: 추가 / 편집 / 삭제

### 5.5 콘텐츠 입력 (`/manage/content`)

가장 자주 쓰는 페이지. 메커닉별 입력 form 4종.

#### 5.5.1 카드 추가 워크플로우

1. **메커닉 선택** — 큰 4 카드 (객관식 / 빈칸 / 타이핑 / 매칭) + 호환성 안내
2. **과목·단원 선택** — 드롭다운
3. **메커닉별 form 입력**
4. 미리보기 → 저장
5. 저장 후 "다음 카드 추가" 또는 "내 게임 풀기" CTA

#### 5.5.2 메커닉별 form

**객관식** (multiple-choice):
```
질문 (textarea)
보기 1 (input)
보기 2 (input)
보기 3 (input)
보기 4 (input)
정답 (radio: 1/2/3/4)
난이도 (1-5 슬라이더)
힌트 (input, 선택)
```

**빈칸** (blank):
```
본문 (textarea, ___ 자리에 빈칸 토큰)
보기 1-4 (input × 4)
정답 (radio)
해설 (textarea, 선택)
난이도 / 힌트
```

**타이핑** (typing):
```
뜻풀이 (textarea)
정답 (input)
한자 표기 (input, 선택)
난이도 / 힌트
```

**매칭** (word-match):
```
짝 (4-8개)
  - 왼쪽 (input)
  - 오른쪽 (input)
  - [+ 행 추가] [- 행 삭제]
난이도 / 힌트
```

#### 5.5.3 입력 검증

- 모든 필수 필드 비면 저장 불가 (버튼 disabled)
- 각 form 별 최소 길이 (예: 질문 5자 이상, 보기 1자 이상)
- 메커닉별 zod schema 으로 검증 (기존 게임 schema 차용)

#### 5.5.4 저장 후 동작

- 저장 시 사용자 토스트: "추가됐어요. 게임 허브에서 풀어볼 수 있어요" + "지금 풀기" 링크
- localStorage 즉시 갱신
- 게임 허브 (`/games`) 의 "나만의 게임" 영역에 즉시 노출

### 5.6 나만의 게임 (`/manage/custom-games`)

- 메커닉별로 그룹: "객관식 카드 N개", "빈칸 카드 M개" 등
- 각 그룹 클릭 → "이 카드로 게임 풀기" → `/games/custom-<mechanic>` 진입
- 카드 수 부족 (1개 미만) 시 빈 상태

### 5.7 커스텀 게임 라우트

`/games/custom-multiple-choice`, `/games/custom-blank`, `/games/custom-typing`, `/games/custom-word-match`

각 라우트 = 기존 본 게임 (math-quick-quiz, english-blank, vocab-typing, english-word-match) 의 component 재사용 + content 만 사용자 카드로 교체.

→ ⚠️ **본 게임 component 가 카드 source 를 prop 으로 받도록 리팩터** 필요.

기존:
```tsx
const cards = getCardSequence();  // 하드코딩 import
```

변경:
```tsx
function GameComponent({ cards }: { cards: CardType[] }) {
  // ...
}
```

각 본 게임 manifest 에는 default content 를 prop 으로 주입하는 wrapper.

→ Phase M3 에서 다룸.

---

## 6. 페이지 IA 자세히

### 6.1 `/manage` 홈 와이어프레임

```
┌────────────────────────────────────────┐
│ 관리                                    │
│ 내 학습 콘텐츠를 만들고 관리해요       │
├────────────────────────────────────────┤
│ ┌─KPI──┬─KPI──┬─KPI──┐                │
│ │ 과목 │ 단원 │ 카드 │                │
│ │  3개 │ 12개 │ 47장 │                │
│ └──────┴──────┴──────┘                │
│                                         │
│ 빠른 진입                              │
│ ┌─CTA─────────┬─CTA─────────┐         │
│ │ + 카드 추가 │ 내 게임 보기 │         │
│ └─────────────┴─────────────┘         │
│                                         │
│ 4-step 가이드 (빈 상태에만)            │
│ 1️⃣ 과목 만들기                          │
│ 2️⃣ 단원 만들기                          │
│ 3️⃣ 카드 입력                            │
│ 4️⃣ 게임 풀기                            │
└────────────────────────────────────────┘
```

### 6.2 `/manage/content` 카드 추가 와이어프레임 (모바일)

```
┌────────────────────────────────────────┐
│ ← 뒤로       카드 추가                 │
├────────────────────────────────────────┤
│ Step 1. 메커닉 고르기                  │
│ ┌──────────────┬──────────────┐       │
│ │ 객관식        │ 빈칸          │       │
│ │ 4지선다       │ 본문 + 빈칸   │       │
│ └──────────────┴──────────────┘       │
│ ┌──────────────┬──────────────┐       │
│ │ 타이핑        │ 매칭          │       │
│ │ 정답 입력     │ 짝 맞추기     │       │
│ └──────────────┴──────────────┘       │
│                                         │
│ Step 2. 과목·단원                      │
│ [과목 선택 ▾] [단원 선택 ▾]            │
│                                         │
│ Step 3. 내용 입력                      │
│ (메커닉별 form)                        │
│                                         │
│ ─── 미리보기 ─────────────────────     │
│ (실제 게임 카드처럼 미리보기)          │
│                                         │
│ [임시 저장] [저장하기]                 │
└────────────────────────────────────────┘
```

---

## 7. 페이지 구현 컴포넌트

### 7.1 신규 (`src/components/manage/`)

```
manage/
  ManageDashboard.tsx
  ManageNav.tsx               # 4 sub-route 탭
  subjects/
    SubjectList.tsx
    SubjectForm.tsx
    SubjectDeleteDialog.tsx
  curriculum/
    CurriculumTree.tsx
    CurriculumForm.tsx
  content/
    MechanicPicker.tsx
    SubjectCurriculumPicker.tsx
    forms/
      MultipleChoiceForm.tsx
      BlankForm.tsx
      TypingForm.tsx
      WordMatchForm.tsx
    CardPreview.tsx
    CardListSection.tsx       # 입력된 카드 리스트
  custom-games/
    CustomGameGroup.tsx       # 메커닉별 그룹
```

### 7.2 신규 (`src/lib/core/storage/custom.ts`)

```ts
// CRUD 함수
export function loadSubjects(): CustomSubject[];
export function saveSubject(s: CustomSubject): void;
export function deleteSubject(id: string): void;
export function loadCurriculum(): CustomCurriculum[];
// ... (curriculum, cards 동일 패턴)

// import / export
export function exportCustomData(): string;        // JSON
export function importCustomData(json: string): void;
```

### 7.3 신규 (`src/games/custom-*`)

```
src/games/
  custom-multiple-choice/
    component.tsx             # math-quick-quiz 의 일반화 wrapper
    manifest.ts               # status='available', children-source='custom'
    content/loader.ts         # localStorage 에서 카드 로드
  custom-blank/
  custom-typing/
  custom-word-match/
```

→ ⚠️ **registry 자동 발견에 영향**. `scripts/generate-registry.ts` 가 `src/games/*/manifest.ts` 패턴 그대로 인식 → custom-* 4개도 자동 등록.

→ 게임 허브의 "나만의 게임" 영역은 manifest 의 `meta.kind === 'custom'` (신규 필드) 로 분리.

### 7.4 manifest 확장

```ts
type GameMeta = {
  // ... 기존
  /** 'official' = 기본 제공, 'custom' = 사용자 콘텐츠 기반 */
  kind: 'official' | 'custom';
};
```

기존 게임 10개는 `kind='official'`. custom-* 4개는 `kind='custom'`.

→ 게임 허브 분리, "나만의 게임" 영역 자동 채워짐.

---

## 8. 본 게임 component 일반화 (Phase M3)

### 8.1 영향 받는 게임 4개

- math-quick-quiz (multiple-choice)
- english-blank (blank, but multiple-choice 기반)
- vocab-typing (typing)
- english-word-match (matching)

### 8.2 리팩터 패턴

기존:
```tsx
// math-quick-quiz/component.tsx
import { getCardSequence } from "./content";
export default function MathQuickQuiz() {
  const [cards] = useState(() => getCardSequence());
  // ...
}
```

변경:
```tsx
// shared/quick-quiz-component.tsx (또는 비슷한 패턴)
export function QuickQuizComponent({
  gameId,
  cards,
  completionMessage,
}: {
  gameId: string;
  cards: QuickQuizCard[];
  completionMessage: string;
}) {
  // ...
}

// math-quick-quiz/component.tsx
import { QuickQuizComponent } from '@/shared/quick-quiz-component';
import { getCardSequence } from "./content";
export default function MathQuickQuiz() {
  return <QuickQuizComponent gameId="math-quick-quiz" cards={getCardSequence()} completionMessage="..." />;
}

// custom-multiple-choice/component.tsx
import { QuickQuizComponent } from '@/shared/quick-quiz-component';
import { loadCustomCards } from '@/lib/core';
export default function CustomMultipleChoice() {
  const [cards, setCards] = useState<QuickQuizCard[]>([]);
  useEffect(() => {
    setCards(convertCustomToQuickQuiz(loadCustomCards('multiple-choice')));
  }, []);
  return <QuickQuizComponent gameId="custom-multiple-choice" cards={cards} completionMessage="..." />;
}
```

### 8.3 게임별 작업량

- **math-quick-quiz** → component 분리 + custom-multiple-choice wrapper. 0.5일.
- **vocab-typing** → 동일. 0.5일.
- **english-word-match** → 동일. 0.5일.
- **english-blank** → 동일. 0.5일.

총 2일. Phase M3.

### 8.4 호환 검증

각 본 게임 동작 변경 0 — 단순 component 분리. 기존 테스트 그대로 통과.

---

## 9. 단계별 구현

### Phase M1 — 데이터 모델 + storage (1일)
- [ ] `src/lib/core/storage/custom.ts` 신규
  - CustomSubject / CustomCurriculum / CustomCard 타입
  - CRUD 함수 + JSON serialize/deserialize
- [ ] zod schema (기존 게임 schema 재활용)
- [ ] 단위 테스트 (mock localStorage)

### Phase M2 — 관리 홈 + 과목 + 교육과정 (1.5일)
- [ ] `app/manage/page.tsx` (홈)
- [ ] `app/manage/subjects/page.tsx`
- [ ] `app/manage/curriculum/page.tsx`
- [ ] `ManageNav` 탭 컴포넌트
- [ ] CRUD UI + 검증

### Phase M3 — 본 게임 component 일반화 (2일)
- [ ] math-quick-quiz / english-blank / vocab-typing / english-word-match
  → component 분리 + custom-* wrapper
- [ ] 기존 게임 동작 검증 (기존 테스트 통과)

### Phase M4 — 콘텐츠 입력 (`/manage/content`) (1.5일)
- [ ] MechanicPicker
- [ ] 4 form (객관식·빈칸·타이핑·매칭)
- [ ] CardPreview (실제 게임 카드처럼)
- [ ] 저장 → 토스트 → 다음 카드 / 게임 풀기

### Phase M5 — 나만의 게임 통합 (0.75일)
- [ ] `app/manage/custom-games/page.tsx`
- [ ] custom-* 4 manifest 신규 + content/loader
- [ ] 게임 허브 (`/games`) 의 "나만의 게임" 영역 데이터 연결 (kind='custom' 분리)

### Phase M6 — export / import (0.5일)
- [ ] `/manage` 홈에 "데이터 내보내기 / 가져오기" 액션
- [ ] JSON 파일 download / file input 처리
- [ ] 충돌 정책: import 시 기존 데이터에 추가 (덮어쓰기 옵션)

### Phase M7 — 검증 (0.5일)
- [ ] typecheck / lint / test
- [ ] dev: 4 메커닉 카드 입력 → 풀기 cycle
- [ ] localStorage 초기화 후 빈 상태 / 데이터 있는 상태

**총 소요: 7.75일.**

→ ⚠️ **이 plan 은 가장 큼**. 다른 plan 들 (nav-ia, home-dashboard, game-hub) 머지 후 진입.

---

## 10. 검증 기준

- [ ] 과목 / 단원 / 카드 CRUD 정상
- [ ] 4 메커닉 모두 카드 입력 → 미리보기 → 저장 cycle 동작
- [ ] 저장 후 게임 허브 "나만의 게임" 영역에 즉시 노출
- [ ] custom-* 4 게임 모두 카드 0개 빈 상태 처리
- [ ] custom-* 4 게임 풀이 시 본 게임과 동일한 UX (FSRS 통합·이벤트 로깅·5-phase)
- [ ] 본 게임 4개 동작 변경 0 (기존 테스트 80/80 통과)
- [ ] export → 다른 환경 import 사이클 데이터 보존
- [ ] localStorage 용량 한계 (5MB) 시 graceful fallback (저장 실패 토스트)
- [ ] 모바일 form 입력 친화 (autoComplete 무효화 등)
- [ ] typecheck / lint / test / build 통과

---

## 11. 사용자 데이터 정책

### 11.1 저장 위치

- localStorage 만 (V0.5)
- 서버 전송 0
- 사용자 fingerprint 외 식별자 0

### 11.2 익명성

기존 정책 ([proc/spec/05-운영-로직.md](../spec/05-운영-로직.md) §Auth/ACL) 일관:
- 카드 텍스트는 사용자 디바이스에만 저장
- 이벤트 로그에는 카드 ID·정답 여부만 (텍스트 X)

### 11.3 export 데이터 책임

사용자가 JSON export 시 텍스트가 그 파일에 들어감. 사용자가 자기 책임으로 관리. UI 에 명시.

### 11.4 V2 SSO 시점

V2 SSO 도입 시 클라우드 동기화 옵션 추가. 그때 사용자 명시 동의 후 서버 전송.

---

## 12. 디자인 결정 (확정)

1. ✅ **V0.5 = 4 메커닉만** (multiple-choice / blank / typing / matching)
   - 이유: 텍스트만으로 카드 매핑 가능
2. ✅ **3-tier 계층** = Subject → Curriculum → Card
   - 이유: 기존 게임의 `subject` / `unit` / `id` 와 1:1 매칭, 재활용성
3. ✅ **localStorage only V0.5** — 서버 동기화 V2 SSO
4. ✅ **본 게임 component 일반화** — custom 과 official 이 같은 컴포넌트 사용
   - 이유: 코드 중복 회피, UX 일관성
5. ✅ **`kind` 필드 manifest 추가** = 'official' / 'custom'
   - 이유: 게임 허브 분리, 향후 권한 분기
6. ✅ **export / import = JSON** — 멀티 디바이스 백업 수단 (V2 전까지)
7. ✅ **AI 자동 생성 X (V0.5)** — 사용자 직접 입력만. AI 는 V0.7+

---

## 13. NOT in scope

- AI 자동 카드 생성 (V0.7+)
- 이미지·수식·동영상 콘텐츠 (V0.6+)
- 다중 사용자 콘텐츠 공유 (V1.0+)
- manipulation·sorting 메커닉 커스텀 (V0.6+)
- 학년·시험 일정 매핑 (V0.6+)
- 카드 통계 분석 (어떤 카드가 어렵나) — V0.6+ 데이터 인프라
- LaTeX·markdown 렌더 (V0.6+)
- 음성 입력 (V1.0+)

---

## 14. NOT in scope (영구)

- 사용자 콘텐츠 서버 영구 저장 (V2 SSO 시 옵트인 동의 모델로만)
- 사용자 콘텐츠 자동 큐레이션 / 검색 노출
- 사용자 콘텐츠 평가·리뷰

---

## 15. 다음 단계

1. 본 plan 검토 — 가장 큰 plan, 단계별 머지 권장
2. APPROVED 시 M1~M7 단계별 구현 (전체 7.75일)
3. M3 (본 게임 일반화) 가 가장 위험 — 기존 4 게임 회귀 검증 필수
4. M5 (나만의 게임 통합) 시점에 `game-hub.md` Phase G4 와 합류
5. M6 (export/import) 후 V2 SSO 도입 시점에 클라우드 동기화 plan 분리
