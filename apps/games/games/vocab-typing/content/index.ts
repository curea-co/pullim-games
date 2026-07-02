// vocab-typing 카드 풀 — 5장, 수능 빈출 한자성어/한자어 (한글 음 입력).

import { VocabTypingCardSchema } from "../schema";
import type { VocabTypingCard } from "../schema";

const RAW_CARDS: VocabTypingCard[] = [
  {
    id: "vt-001",
    type: "vocab-typing",
    unit: "고1-국어-한자어",
    difficultySeed: 1,
    hint: "두 글자",
    problem: {
      meaning: "앞뒤가 서로 맞지 않는 일",
      answer: "모순",
      pronunciation: "矛盾",
    },
  },
  {
    id: "vt-002",
    type: "vocab-typing",
    unit: "고1-국어-한자성어",
    difficultySeed: 3,
    hint: "잠자코 아무 대답도 안 함",
    problem: {
      meaning: "잠자코 아무 대답도 하지 않음",
      answer: "묵묵부답",
      pronunciation: "默默不答",
    },
  },
  {
    id: "vt-003",
    type: "vocab-typing",
    unit: "고1-국어-한자성어",
    difficultySeed: 3,
    hint: "한 가지 일로 두 가지 이익",
    problem: {
      meaning: "한 가지 일을 하여 두 가지 이익을 얻음",
      answer: "일거양득",
      pronunciation: "一擧兩得",
    },
  },
  {
    id: "vt-004",
    type: "vocab-typing",
    unit: "고1-국어-한자성어",
    difficultySeed: 4,
    hint: "이를 갈며 마음을 썩임",
    problem: {
      meaning: "이를 갈고 마음을 썩이며 분하게 여김",
      answer: "절치부심",
      pronunciation: "切齒腐心",
    },
  },
  {
    id: "vt-005",
    type: "vocab-typing",
    unit: "고1-국어-한자성어",
    difficultySeed: 4,
    hint: "여러 시문이 모두 비슷비슷",
    problem: {
      meaning: "여러 시문이 모두 비슷비슷하여 개성이 없음",
      answer: "천편일률",
      pronunciation: "千篇一律",
    },
  },
];

export const cards: VocabTypingCard[] = RAW_CARDS.map((raw, i) => {
  const r = VocabTypingCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[vocab-typing] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): VocabTypingCard[] {
  return [...cards];
}
