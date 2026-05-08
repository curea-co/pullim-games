// physics-vector 카드 풀 — 5장, 두 벡터 합성 (난이도 1~5).
// 모든 합벡터는 원점에서 시작.

import { VectorCardSchema } from "../schema";
import type { VectorCard } from "../schema";

const RAW_CARDS: VectorCard[] = [
  {
    id: "pv-001",
    type: "vector",
    unit: "고2-물리I-직각합성",
    difficultySeed: 1,
    hint: "x 와 y 가 직각",
    problem: {
      context: "두 힘 F1, F2 가 직각으로 작용할 때 합력은?",
      vectors: [
        { origin: [0, 0], components: [3, 0], label: "F1" },
        { origin: [0, 0], components: [0, 4], label: "F2" },
      ],
      resultant: { origin: [0, 0], components: [3, 4], label: "R" },
    },
  },
  {
    id: "pv-002",
    type: "vector",
    unit: "고2-물리I-평행합성",
    difficultySeed: 2,
    hint: "같은 방향 = 크기 합",
    problem: {
      context: "같은 방향 두 힘의 합력은?",
      vectors: [
        { origin: [0, 0], components: [2, 0], label: "F1" },
        { origin: [0, 0], components: [3, 0], label: "F2" },
      ],
      resultant: { origin: [0, 0], components: [5, 0], label: "R" },
    },
  },
  {
    id: "pv-003",
    type: "vector",
    unit: "고2-물리I-반대합성",
    difficultySeed: 3,
    hint: "반대 방향 = 크기 차",
    problem: {
      context: "반대 방향 두 힘의 합력은?",
      vectors: [
        { origin: [0, 0], components: [5, 0], label: "F1" },
        { origin: [0, 0], components: [-2, 0], label: "F2" },
      ],
      resultant: { origin: [0, 0], components: [3, 0], label: "R" },
    },
  },
  {
    id: "pv-004",
    type: "vector",
    unit: "고2-물리I-일반합성",
    difficultySeed: 4,
    hint: "x 성분과 y 성분을 따로",
    problem: {
      context: "임의각 두 힘의 합력은?",
      vectors: [
        { origin: [0, 0], components: [3, 0], label: "F1" },
        { origin: [0, 0], components: [2, 2], label: "F2" },
      ],
      resultant: { origin: [0, 0], components: [5, 2], label: "R" },
    },
  },
  {
    id: "pv-005",
    type: "vector",
    unit: "고2-물리I-음수성분",
    difficultySeed: 5,
    hint: "성분이 음수일 수 있어요",
    problem: {
      context: "두 벡터의 합벡터는?",
      vectors: [
        { origin: [0, 0], components: [-2, 1], label: "F1" },
        { origin: [0, 0], components: [3, 2], label: "F2" },
      ],
      resultant: { origin: [0, 0], components: [1, 3], label: "R" },
    },
  },
];

export const cards: VectorCard[] = RAW_CARDS.map((raw, i) => {
  const r = VectorCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[physics-vector] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): VectorCard[] {
  return [...cards];
}
