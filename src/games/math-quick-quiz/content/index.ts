// math-quick-quiz 카드 풀 — 5장, 고1 전 단원 단답.

import { QuickQuizCardSchema } from "../schema";
import type { QuickQuizCard } from "../schema";

const RAW_CARDS: QuickQuizCard[] = [
  {
    id: "qq-001",
    type: "multiple-choice",
    unit: "고1-인수분해-공통인수",
    difficultySeed: 1,
    hint: "공통인수를 빼낸 형태",
    problem: {
      question: "2x + 4 의 인수분해는?",
      choices: ["x(2 + 4)", "2(x + 2)", "2x + 4", "(x+2)(x-2)"],
      correctIndex: 1,
    },
  },
  {
    id: "qq-002",
    type: "multiple-choice",
    unit: "고1-인수분해-합곱",
    difficultySeed: 2,
    hint: "더해서 5, 곱해서 6",
    problem: {
      question: "x² + 5x + 6 의 인수분해는?",
      choices: ["(x+2)(x+3)", "(x+1)(x+6)", "(x-2)(x-3)", "x(x+5)+6"],
      correctIndex: 0,
    },
  },
  {
    id: "qq-003",
    type: "multiple-choice",
    unit: "고1-함수-기초",
    difficultySeed: 2,
    problem: {
      question: "f(x) = 3x + 1 일 때 f(2) 는?",
      choices: ["5", "6", "7", "8"],
      correctIndex: 2,
    },
  },
  {
    id: "qq-004",
    type: "multiple-choice",
    unit: "고1-수와식-제곱근",
    difficultySeed: 3,
    problem: {
      question: "√50 을 간단히 하면?",
      choices: ["5√2", "2√5", "√10", "10"],
      correctIndex: 0,
    },
  },
  {
    id: "qq-005",
    type: "multiple-choice",
    unit: "고1-방정식-이차",
    difficultySeed: 4,
    hint: "근의 공식 또는 인수분해",
    problem: {
      question: "x² - 5x + 6 = 0 의 해는?",
      choices: ["x = 1, 6", "x = -2, -3", "x = 2, 3", "x = -1, 6"],
      correctIndex: 2,
    },
  },
];

export const cards: QuickQuizCard[] = RAW_CARDS.map((raw, i) => {
  const r = QuickQuizCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[math-quick-quiz] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): QuickQuizCard[] {
  return [...cards];
}
