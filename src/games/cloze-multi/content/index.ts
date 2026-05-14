// 다중 빈칸 cloze 카드 풀 — V0: 5장. 영어 5형식 어순 (S/V/SC/O/OC).
// 카드 풀에는 distractor 가 1~2개 섞임 → 끼워맞추기 회피.
// passage 는 blank 토큰 + 보충 text 토큰(부사·구두점 등) 으로 구성.

import { ClozeMultiCardSchema } from "../schema";
import type { ClozeMultiCard } from "../schema";

const RAW_CARDS: ClozeMultiCard[] = [
  // Card 1 — 1형식 SV (난이도 1)
  {
    id: "card-001",
    type: "cloze-multi",
    unit: "고1-영어-5형식-1형식",
    difficultySeed: 1,
    hint: "1형식: 주어 + 동사. 누가 어떻게 했는지만 있으면 끝.",
    problem: {
      passage: [
        { kind: "blank", slotId: "s1" },
        { kind: "blank", slotId: "s2" },
        { kind: "text", text: "soundly." },
      ],
      blanks: [
        { id: "s1", correctCardId: "c-baby" }, // S
        { id: "s2", correctCardId: "c-slept" }, // V
      ],
      cards: [
        { id: "c-baby", text: "The baby" },
        { id: "c-slept", text: "slept" },
        { id: "c-quickly", text: "quickly" }, // distractor (부사)
      ],
    },
  },
  // Card 2 — 2형식 SVC (난이도 2)
  {
    id: "card-002",
    type: "cloze-multi",
    unit: "고1-영어-5형식-2형식",
    difficultySeed: 2,
    hint: "2형식: 주어 + 동사 + 주격보어. 보어는 주어를 설명해요.",
    problem: {
      passage: [
        { kind: "blank", slotId: "s1" },
        { kind: "blank", slotId: "s2" },
        { kind: "blank", slotId: "s3" },
        { kind: "text", text: "." },
      ],
      blanks: [
        { id: "s1", correctCardId: "c-she" }, // S
        { id: "s2", correctCardId: "c-became" }, // V
        { id: "s3", correctCardId: "c-doctor" }, // SC
      ],
      cards: [
        { id: "c-she", text: "She" },
        { id: "c-became", text: "became" },
        { id: "c-doctor", text: "a doctor" },
        { id: "c-quickly", text: "quickly" }, // distractor (부사)
      ],
    },
  },
  // Card 3 — 3형식 SVO (난이도 3)
  {
    id: "card-003",
    type: "cloze-multi",
    unit: "고1-영어-5형식-3형식",
    difficultySeed: 3,
    hint: "3형식: 주어 + 동사 + 목적어. 목적어는 동작의 대상.",
    problem: {
      passage: [
        { kind: "blank", slotId: "s1" },
        { kind: "blank", slotId: "s2" },
        { kind: "blank", slotId: "s3" },
        { kind: "text", text: "every day." },
      ],
      blanks: [
        { id: "s1", correctCardId: "c-tom" },
        { id: "s2", correctCardId: "c-reads" },
        { id: "s3", correctCardId: "c-books" },
      ],
      cards: [
        { id: "c-tom", text: "Tom" },
        { id: "c-reads", text: "reads" },
        { id: "c-books", text: "books" },
        { id: "c-happy", text: "happy" }, // distractor (형용사)
      ],
    },
  },
  // Card 4 — 4형식 SVOO (난이도 4)
  {
    id: "card-004",
    type: "cloze-multi",
    unit: "고1-영어-5형식-4형식",
    difficultySeed: 4,
    hint: "4형식: 주어 + 수여동사 + 간접목적어(IO) + 직접목적어(DO). 누구에게 무엇을.",
    problem: {
      passage: [
        { kind: "blank", slotId: "s1" },
        { kind: "blank", slotId: "s2" },
        { kind: "blank", slotId: "s3" },
        { kind: "blank", slotId: "s4" },
        { kind: "text", text: "." },
      ],
      blanks: [
        { id: "s1", correctCardId: "c-mom" }, // S
        { id: "s2", correctCardId: "c-gave" }, // V
        { id: "s3", correctCardId: "c-me" }, // IO
        { id: "s4", correctCardId: "c-gift" }, // DO
      ],
      cards: [
        { id: "c-mom", text: "Mom" },
        { id: "c-gave", text: "gave" },
        { id: "c-me", text: "me" },
        { id: "c-gift", text: "a gift" },
        { id: "c-kindly", text: "kindly" }, // distractor (부사)
      ],
    },
  },
  // Card 5 — 5형식 SVOC (난이도 5, 와우)
  {
    id: "card-005",
    type: "cloze-multi",
    unit: "고1-영어-5형식-5형식",
    difficultySeed: 5,
    hint: "5형식: 주어 + 동사 + 목적어 + 목적격보어. 보어는 목적어 상태/행위.",
    problem: {
      passage: [
        { kind: "blank", slotId: "s1" },
        { kind: "blank", slotId: "s2" },
        { kind: "blank", slotId: "s3" },
        { kind: "blank", slotId: "s4" },
        { kind: "text", text: "." },
      ],
      blanks: [
        { id: "s1", correctCardId: "c-we" }, // S
        { id: "s2", correctCardId: "c-call" }, // V
        { id: "s3", correctCardId: "c-him" }, // O
        { id: "s4", correctCardId: "c-genius" }, // OC
      ],
      cards: [
        { id: "c-we", text: "We" },
        { id: "c-call", text: "call" },
        { id: "c-him", text: "him" },
        { id: "c-genius", text: "a genius" },
        { id: "c-yesterday", text: "yesterday" }, // distractor (부사)
        { id: "c-kindly", text: "kindly" }, // distractor (부사)
      ],
    },
  },
];

// 런타임 검증
export const cards: ClozeMultiCard[] = RAW_CARDS.map((raw, i) => {
  const result = ClozeMultiCardSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[cloze-multi] card ${i} schema invalid: ${result.error.message}`,
    );
  }
  return result.data;
});

export function getCardById(id: string): ClozeMultiCard | undefined {
  return cards.find((c) => c.id === id);
}

export function getCardSequence(): ClozeMultiCard[] {
  return [...cards];
}
