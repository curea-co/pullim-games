// chemistry-balance 카드 풀 — 5장, 화학 반응식 균형 (난이도 1~5).

import { ChemistryBalanceCardSchema } from "../schema";
import type { ChemistryBalanceCard } from "../schema";

const RAW_CARDS: ChemistryBalanceCard[] = [
  {
    id: "cb-001",
    type: "chemistry-balance",
    unit: "고2-화학I-단순결합",
    difficultySeed: 1,
    hint: "양쪽 H 와 O 원자 수가 같도록",
    problem: {
      reactants: [
        { formula: "H2", coefficient: 2 },
        { formula: "O2", coefficient: 1 },
      ],
      products: [{ formula: "H2O", coefficient: 2 }],
    },
  },
  {
    id: "cb-002",
    type: "chemistry-balance",
    unit: "고2-화학I-분해반응",
    difficultySeed: 2,
    hint: "K, Cl, O 모두 균형",
    problem: {
      reactants: [{ formula: "KClO3", coefficient: 2 }],
      products: [
        { formula: "KCl", coefficient: 2 },
        { formula: "O2", coefficient: 3 },
      ],
    },
  },
  {
    id: "cb-003",
    type: "chemistry-balance",
    unit: "고2-화학I-연소",
    difficultySeed: 3,
    hint: "메탄의 완전 연소",
    problem: {
      reactants: [
        { formula: "CH4", coefficient: 1 },
        { formula: "O2", coefficient: 2 },
      ],
      products: [
        { formula: "CO2", coefficient: 1 },
        { formula: "H2O", coefficient: 2 },
      ],
    },
  },
  {
    id: "cb-004",
    type: "chemistry-balance",
    unit: "고2-화학I-금속산화",
    difficultySeed: 4,
    hint: "Fe2O3 의 Fe:O = 2:3",
    problem: {
      reactants: [
        { formula: "Fe", coefficient: 4 },
        { formula: "O2", coefficient: 3 },
      ],
      products: [{ formula: "Fe2O3", coefficient: 2 }],
    },
  },
  {
    id: "cb-005",
    type: "chemistry-balance",
    unit: "고2-화학I-유기연소",
    difficultySeed: 5,
    hint: "에탄(C2H6)의 완전 연소",
    problem: {
      reactants: [
        { formula: "C2H6", coefficient: 2 },
        { formula: "O2", coefficient: 7 },
      ],
      products: [
        { formula: "CO2", coefficient: 4 },
        { formula: "H2O", coefficient: 6 },
      ],
    },
  },
];

export const cards: ChemistryBalanceCard[] = RAW_CARDS.map((raw, i) => {
  const r = ChemistryBalanceCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[chemistry-balance] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): ChemistryBalanceCard[] {
  return [...cards];
}
