// english-order 카드 풀 — 5장, 어순 난이도 점진 상승.

import { WordOrderCardSchema } from "../schema";
import type { WordOrderCard } from "../schema";

const RAW_CARDS: WordOrderCard[] = [
  {
    id: "eo-001",
    type: "word-order",
    unit: "고1-영어-기본문장",
    difficultySeed: 1,
    hint: "주어 + 동사 + 보어",
    problem: {
      korean: "나는 학생이다",
      english: ["I", "am", "a", "student"],
    },
  },
  {
    id: "eo-002",
    type: "word-order",
    unit: "고1-영어-3형식",
    difficultySeed: 1,
    hint: "주어 + 동사 + 목적어",
    problem: {
      korean: "그는 사과를 좋아한다",
      english: ["He", "likes", "apples"],
    },
  },
  {
    id: "eo-003",
    type: "word-order",
    unit: "고1-영어-시간부사",
    difficultySeed: 2,
    hint: "시간 부사구는 문장 끝에",
    problem: {
      korean: "우리는 매일 학교에 간다",
      english: ["We", "go", "to", "school", "every", "day"],
    },
  },
  {
    id: "eo-004",
    type: "word-order",
    unit: "고1-영어-과거시제",
    difficultySeed: 3,
    hint: "과거 동사 + 시간부사",
    problem: {
      korean: "그녀는 어제 책을 샀다",
      english: ["She", "bought", "a", "book", "yesterday"],
    },
  },
  {
    id: "eo-005",
    type: "word-order",
    unit: "고1-영어-부사위치",
    difficultySeed: 4,
    hint: "빈도/방법 부사는 동사 옆",
    problem: {
      korean: "내 친구는 영어를 잘 한다",
      english: ["My", "friend", "speaks", "English", "well"],
    },
  },
];

export const cards: WordOrderCard[] = RAW_CARDS.map((raw, i) => {
  const r = WordOrderCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[english-order] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): WordOrderCard[] {
  return [...cards];
}
