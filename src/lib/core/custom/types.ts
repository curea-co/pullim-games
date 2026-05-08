// 사용자 커스텀 콘텐츠 타입.
// `2026-05-08_management.md` §4 따름.

export type CustomCardKind =
  | "multiple-choice"
  | "blank"
  | "typing"
  | "word-match";

export interface CustomSubject {
  id: string;
  name: string;
  iconKey?: string; // lucide 이름. 기본 BookOpen
  color?: string; // hex. 기본 jade
  createdAt: string; // ISO
  updatedAt: string;
}

export interface CustomCurriculum {
  id: string;
  subjectId: string;
  name: string;
  parentId?: string; // 트리
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomCardCommon {
  id: string;
  subjectId: string;
  curriculumId: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomMultipleChoiceCard extends CustomCardCommon {
  kind: "multiple-choice";
  question: string;
  choices: string[]; // 4개
  correctIndex: number;
}

export interface CustomBlankCard extends CustomCardCommon {
  kind: "blank";
  passage: string; // ___ 토큰
  choices: string[]; // 4개
  correctIndex: number;
  rationale?: string;
}

export interface CustomTypingCard extends CustomCardCommon {
  kind: "typing";
  meaning: string;
  answer: string;
  pronunciation?: string;
}

export interface CustomWordMatchCard extends CustomCardCommon {
  kind: "word-match";
  pairs: { left: string; right: string }[]; // 4-8개
}

export type CustomCard =
  | CustomMultipleChoiceCard
  | CustomBlankCard
  | CustomTypingCard
  | CustomWordMatchCard;

/** 모든 사용자 데이터 (export/import 단위) */
export interface CustomDataExport {
  version: 1;
  exportedAt: string;
  subjects: CustomSubject[];
  curriculum: CustomCurriculum[];
  cards: CustomCard[];
}

// ── Draft 타입 (id/subjectId/curriculumId/createdAt/updatedAt 제외) ──
// Mode A (curriculum seed converter) 와 Mode B (LLM tool-use response) 둘 다 이 타입을 만듦.
// 저장 직전 user-chosen subject/curriculum + id/timestamps 를 붙여 CustomCard 로 승격.

type DraftStripKeys = "id" | "subjectId" | "curriculumId" | "createdAt" | "updatedAt";

export type MultipleChoiceDraft = Omit<CustomMultipleChoiceCard, DraftStripKeys>;
export type BlankDraft = Omit<CustomBlankCard, DraftStripKeys>;
export type TypingDraft = Omit<CustomTypingCard, DraftStripKeys>;
export type WordMatchDraft = Omit<CustomWordMatchCard, DraftStripKeys>;

export type CustomCardDraft =
  | MultipleChoiceDraft
  | BlankDraft
  | TypingDraft
  | WordMatchDraft;
