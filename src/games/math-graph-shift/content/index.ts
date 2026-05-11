// math-graph-shift 카드 풀 — 5장, 이차함수 변형 (난이도 1~5).
// 시작은 항상 y = x², 목표는 y = a(x-h)^2 + k.

import { GraphShiftCardSchema } from "../schema";
import type { GraphShiftCard } from "../schema";

const RAW_CARDS: GraphShiftCard[] = [
  {
    id: "gs-001",
    type: "graph-shift",
    unit: "고1-함수-평행이동x",
    difficultySeed: 1,
    hint: "(x-h)² 의 h 만 조정",
    problem: {
      startEquation: "y = x²",
      targetEquation: "y = (x - 2)²",
      targetA: 1,
      targetH: 2,
      targetK: 0,
    },
  },
  {
    id: "gs-002",
    type: "graph-shift",
    unit: "고1-함수-평행이동y",
    difficultySeed: 2,
    hint: "+ k 가 위로 이동",
    problem: {
      startEquation: "y = x²",
      targetEquation: "y = x² + 3",
      targetA: 1,
      targetH: 0,
      targetK: 3,
    },
  },
  {
    id: "gs-003",
    type: "graph-shift",
    unit: "고1-함수-평행이동xy",
    difficultySeed: 3,
    hint: "h 와 k 동시 조정",
    problem: {
      startEquation: "y = x²",
      targetEquation: "y = (x - 2)² + 3",
      targetA: 1,
      targetH: 2,
      targetK: 3,
    },
  },
  {
    id: "gs-004",
    type: "graph-shift",
    unit: "고1-함수-확대",
    difficultySeed: 4,
    hint: "a 가 곡률을 결정",
    problem: {
      startEquation: "y = x²",
      targetEquation: "y = 2x²",
      targetA: 2,
      targetH: 0,
      targetK: 0,
    },
  },
  {
    id: "gs-005",
    type: "graph-shift",
    unit: "고1-함수-반사평행이동",
    difficultySeed: 5,
    hint: "a 음수 → 반사",
    problem: {
      startEquation: "y = x²",
      targetEquation: "y = -(x - 1)² + 4",
      targetA: -1,
      targetH: 1,
      targetK: 4,
    },
  },
];

export const cards: GraphShiftCard[] = RAW_CARDS.map((raw, i) => {
  const r = GraphShiftCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[math-graph-shift] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): GraphShiftCard[] {
  return [...cards];
}
