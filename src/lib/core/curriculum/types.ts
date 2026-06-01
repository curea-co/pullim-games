// 교육과정 seed 타입 — Mode A (curriculum-based 자동 생성) 의 입력 데이터.
// `2026-05-08_management-auto-generation.md` §3.1 따름.

export interface SeedVocabulary {
  /** 정답 (단어/용어/식) */
  term: string;
  /** 뜻/설명 */
  meaning: string;
  /** 한자/발음 등 부가 정보 (선택) */
  pronunciation?: string;
}

export interface SeedPair {
  left: string;
  right: string;
}

export interface SeedQuiz {
  question: string;
  /** 4 보기 */
  choices: string[];
  /** 정답 인덱스 0..3 */
  correctIndex: number;
  rationale?: string;
}

export interface SeedPassage {
  /** ___ 토큰이 아니라 일반 문장. 컨버터가 정답 자리를 ___ 로 치환 */
  passage: string;
  /** 정답 (지문 안 ___ 자리에 들어갈 것) */
  answer: string;
  /** 오답 3개 */
  distractors: string[];
  rationale?: string;
}

export interface CurriculumSeed {
  subjectId: string;
  subjectName: string;
  unitId: string;
  unitName: string;
  vocabulary: SeedVocabulary[];
  pairs: SeedPair[];
  quizzes: SeedQuiz[];
  passages: SeedPassage[];
}

