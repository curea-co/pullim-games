// english-blank 카드 풀 — 5장, 자체 작성 본문 (저작권 회피).
// 본문 내 ___ 자리 = 빈칸. 4지선다.

import { BlankCardSchema } from "../schema";
import type { BlankCard } from "../schema";

const RAW_CARDS: BlankCard[] = [
  {
    id: "eb-001",
    type: "blank",
    unit: "고1-영어-빈칸어휘",
    difficultySeed: 2,
    hint: "맥락이 가벼워요",
    problem: {
      passage:
        "Reading widely is one of the most effective ways to improve your vocabulary. The more you read, the more new words you ___, often without even noticing.",
      choices: ["encounter", "ignore", "remember", "copy"],
      correctIndex: 0,
      rationale: "넓게 읽을수록 새 단어를 자연스럽게 '마주치게' 됩니다.",
    },
  },
  {
    id: "eb-002",
    type: "blank",
    unit: "고1-영어-빈칸대비",
    difficultySeed: 3,
    hint: "however 가 단서",
    problem: {
      passage:
        "Many scientists once believed that emotions were ___ to logical thinking. Recent research, however, suggests that feelings actually guide rational decisions in subtle ways.",
      choices: ["opposed", "related", "similar", "identical"],
      correctIndex: 0,
      rationale:
        "however 로 대비되는 구조. 과거에는 감정과 논리가 서로 반대된다(opposed)고 봤다는 흐름이에요.",
    },
  },
  {
    id: "eb-003",
    type: "blank",
    unit: "고1-영어-빈칸함의",
    difficultySeed: 3,
    hint: "Without ___ + 부정 결과",
    problem: {
      passage:
        "Although the technology was promising, the company struggled to convince investors. Without ___ funding, even the best ideas remain on paper.",
      choices: ["sufficient", "excessive", "traditional", "random"],
      correctIndex: 0,
      rationale:
        "투자가 부족해 좋은 아이디어가 종이에 머문다는 의미. '충분한(sufficient)' 자금이 없을 때.",
    },
  },
  {
    id: "eb-004",
    type: "blank",
    unit: "고1-영어-빈칸추론",
    difficultySeed: 4,
    hint: "지식을 '자기 것으로'",
    problem: {
      passage:
        "True learning requires more than memorizing facts. Students must ___ what they read with their own questions and experiences to make knowledge truly their own.",
      choices: ["connect", "replace", "separate", "hide"],
      correctIndex: 0,
      rationale:
        "지식을 자기 것으로 만들려면 자신의 질문·경험과 '연결(connect)'해야 합니다.",
    },
  },
  {
    id: "eb-005",
    type: "blank",
    unit: "고1-영어-빈칸어휘추론",
    difficultySeed: 5,
    hint: "회복하는 힘",
    problem: {
      passage:
        "Some species have evolved to thrive in environments where most others would perish. This adaptability is not a sign of weakness but of ___, demonstrating life's remarkable creativity.",
      choices: ["resilience", "decline", "confusion", "imitation"],
      correctIndex: 0,
      rationale:
        "극한 환경에서도 번성하는 능력 = 회복탄력성(resilience). 약함이 아니라 강함의 표현.",
    },
  },
];

export const cards: BlankCard[] = RAW_CARDS.map((raw, i) => {
  const r = BlankCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[english-blank] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): BlankCard[] {
  return [...cards];
}
