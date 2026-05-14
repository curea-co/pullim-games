// 한자 부수 조합 카드 풀 — V0: 5장. 난이도 1→5.
// 1: 林 (木+木), 2: 明 (日+月), 3: 休 (人+木), 4: 好 (女+子), 5: 森 (木+木+木)
// 카드 풀에는 distractor 부수 1~2개 섞임 → 끼워맞추기 회피.

import { LetterAssemblyCardSchema } from "../schema";
import type { LetterAssemblyCard } from "../schema";

const RAW_CARDS: LetterAssemblyCard[] = [
  {
    id: "card-001",
    type: "letter-assembly",
    unit: "고1-국어-한자-합자(좌우)",
    difficultySeed: 1,
    hint: "같은 부수를 두 번 — 나무가 둘이면?",
    problem: {
      target: { hanja: "林", meaning: "수풀", reading: "림" },
      slots: [
        { id: "s1", correctCardId: "c-mok-1" },
        { id: "s2", correctCardId: "c-mok-2" },
      ],
      cards: [
        { id: "c-mok-1", text: "木", label: "나무 목" },
        { id: "c-mok-2", text: "木", label: "나무 목" },
        { id: "c-il", text: "日", label: "날 일" }, // distractor
      ],
    },
  },
  {
    id: "card-002",
    type: "letter-assembly",
    unit: "고1-국어-한자-합자(해+달)",
    difficultySeed: 2,
    hint: "해와 달이 함께 있으면 어떤 상태일까?",
    problem: {
      target: { hanja: "明", meaning: "밝을", reading: "명" },
      slots: [
        { id: "s1", correctCardId: "c-il" },
        { id: "s2", correctCardId: "c-wol" },
      ],
      cards: [
        { id: "c-il", text: "日", label: "날 일" },
        { id: "c-wol", text: "月", label: "달 월" },
        { id: "c-mok", text: "木", label: "나무 목" }, // distractor
      ],
    },
  },
  {
    id: "card-003",
    type: "letter-assembly",
    unit: "고1-국어-한자-합자(사람+나무)",
    difficultySeed: 3,
    hint: "사람이 나무에 기대면?",
    problem: {
      target: { hanja: "休", meaning: "쉴", reading: "휴" },
      slots: [
        { id: "s1", correctCardId: "c-in" },
        { id: "s2", correctCardId: "c-mok" },
      ],
      cards: [
        { id: "c-in", text: "人", label: "사람 인" },
        { id: "c-mok", text: "木", label: "나무 목" },
        { id: "c-il", text: "日", label: "날 일" }, // distractor
        { id: "c-su", text: "水", label: "물 수" }, // distractor
      ],
    },
  },
  {
    id: "card-004",
    type: "letter-assembly",
    unit: "고1-국어-한자-합자(여자+자식)",
    difficultySeed: 4,
    hint: "어머니와 자식이 함께 — 좋다",
    problem: {
      target: { hanja: "好", meaning: "좋을", reading: "호" },
      slots: [
        { id: "s1", correctCardId: "c-nyeo" },
        { id: "s2", correctCardId: "c-ja" },
      ],
      cards: [
        { id: "c-nyeo", text: "女", label: "여자 녀" },
        { id: "c-ja", text: "子", label: "아들 자" },
        { id: "c-in", text: "人", label: "사람 인" }, // distractor
        { id: "c-il", text: "日", label: "날 일" }, // distractor
      ],
    },
  },
  {
    id: "card-005",
    type: "letter-assembly",
    unit: "고1-국어-한자-합자(셋겹침)",
    difficultySeed: 5,
    hint: "나무가 셋이면 수풀보다 더 우거진 — 빽빽한 숲",
    problem: {
      target: { hanja: "森", meaning: "빽빽할", reading: "삼" },
      slots: [
        { id: "s1", correctCardId: "c-mok-1" },
        { id: "s2", correctCardId: "c-mok-2" },
        { id: "s3", correctCardId: "c-mok-3" },
      ],
      cards: [
        { id: "c-mok-1", text: "木", label: "나무 목" },
        { id: "c-mok-2", text: "木", label: "나무 목" },
        { id: "c-mok-3", text: "木", label: "나무 목" },
        { id: "c-il", text: "日", label: "날 일" }, // distractor
        { id: "c-wol", text: "月", label: "달 월" }, // distractor
      ],
    },
  },
];

export const cards: LetterAssemblyCard[] = RAW_CARDS.map((raw, i) => {
  const result = LetterAssemblyCardSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[letter-assembly] card ${i} schema invalid: ${result.error.message}`,
    );
  }
  return result.data;
});

export function getCardById(id: string): LetterAssemblyCard | undefined {
  return cards.find((c) => c.id === id);
}

export function getCardSequence(): LetterAssemblyCard[] {
  return [...cards];
}
