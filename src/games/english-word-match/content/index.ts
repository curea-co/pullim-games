// english-word-match 카드 풀 — 5장, 수능 어휘 매칭 (영어↔한국어).

import { WordMatchCardSchema } from "../schema";
import type { WordMatchCard } from "../schema";

const RAW_CARDS: WordMatchCard[] = [
  {
    id: "wm-001",
    type: "word-match",
    unit: "고2-영어-수능동사",
    difficultySeed: 2,
    hint: "수능 빈출 동사 5종",
    problem: {
      pairs: [
        { english: "pursue", korean: "추구하다" },
        { english: "contradict", korean: "모순되다" },
        { english: "perceive", korean: "인식하다" },
        { english: "distinguish", korean: "구별하다" },
        { english: "regulate", korean: "조절하다" },
      ],
    },
  },
  {
    id: "wm-002",
    type: "word-match",
    unit: "고2-영어-추상명사",
    difficultySeed: 3,
    hint: "추상 명사 5종",
    problem: {
      pairs: [
        { english: "integrity", korean: "진실성" },
        { english: "prejudice", korean: "편견" },
        { english: "dilemma", korean: "딜레마" },
        { english: "consensus", korean: "합의" },
        { english: "perspective", korean: "관점" },
      ],
    },
  },
  {
    id: "wm-003",
    type: "word-match",
    unit: "고2-영어-형용사",
    difficultySeed: 3,
    hint: "수능 형용사 5종",
    problem: {
      pairs: [
        { english: "profound", korean: "심오한" },
        { english: "ambiguous", korean: "애매한" },
        { english: "inevitable", korean: "불가피한" },
        { english: "sufficient", korean: "충분한" },
        { english: "deliberate", korean: "의도적인" },
      ],
    },
  },
  {
    id: "wm-004",
    type: "word-match",
    unit: "고2-영어-혼동어휘",
    difficultySeed: 4,
    hint: "헷갈리기 쉬운 어휘",
    problem: {
      pairs: [
        { english: "adopt", korean: "채택하다" },
        { english: "adapt", korean: "적응하다" },
        { english: "principle", korean: "원칙" },
        { english: "principal", korean: "주요한" },
        { english: "compose", korean: "작곡하다" },
      ],
    },
  },
  {
    id: "wm-005",
    type: "word-match",
    unit: "고2-영어-어법빈출",
    difficultySeed: 4,
    hint: "수능 어법 빈출 동사",
    problem: {
      pairs: [
        { english: "confide", korean: "신뢰하다" },
        { english: "comprise", korean: "구성되다" },
        { english: "derive", korean: "유래하다" },
        { english: "devote", korean: "헌신하다" },
        { english: "yield", korean: "양보하다" },
      ],
    },
  },
];

export const cards: WordMatchCard[] = RAW_CARDS.map((raw, i) => {
  const r = WordMatchCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[english-word-match] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): WordMatchCard[] {
  return [...cards];
}
