// 펀넷 사각형 카드 풀 — V0: 5장.
// 멘델 우성/열성 모델만 (불완전우성·치사·복대립은 V1 이후).
// 난이도: 단성 자손교배 → 단성 검정교배 → 양성 검정교배 → 양성 부분이형 → 양성 자손교배

import { PunnettCardSchema } from "../schema";
import type { PunnettCard } from "../schema";

const SEED_PEA = {
  name: "씨앗 색",
  symbol: "A",
  dominant: "노란색",
  recessive: "초록색",
} as const;

const SEED_SHAPE = {
  name: "씨앗 모양",
  symbol: "B",
  dominant: "둥근",
  recessive: "주름",
} as const;

const RAW_CARDS: PunnettCard[] = [
  {
    id: "card-001",
    type: "genetics-punnett",
    unit: "고1-생명과학-멘델-단성잡종",
    difficultySeed: 1,
    hint: "Aa × Aa — 자손은 어떤 비율로 나올까요",
    problem: {
      p1: "Aa",
      p2: "Aa",
      traits: [SEED_PEA],
      expectedRatio: [3, 1],
    },
  },
  {
    id: "card-002",
    type: "genetics-punnett",
    unit: "고1-생명과학-멘델-검정교배",
    difficultySeed: 2,
    hint: "이형접합 × 열성호모 — 검정교배 비율",
    problem: {
      p1: "Aa",
      p2: "aa",
      traits: [SEED_PEA],
      expectedRatio: [1, 1],
    },
  },
  {
    id: "card-003",
    type: "genetics-punnett",
    unit: "고1-생명과학-멘델-양성잡종",
    difficultySeed: 3,
    hint: "양성잡종 검정교배 — 4 표현형 비율",
    problem: {
      p1: "AaBb",
      p2: "aabb",
      traits: [SEED_PEA, SEED_SHAPE],
      expectedRatio: [1, 1, 1, 1],
    },
  },
  {
    id: "card-004",
    type: "genetics-punnett",
    unit: "고1-생명과학-멘델-양성잡종",
    difficultySeed: 4,
    hint: "한 형질만 이형 — 비율이 비대칭",
    problem: {
      p1: "AaBb",
      p2: "Aabb",
      traits: [SEED_PEA, SEED_SHAPE],
      expectedRatio: [3, 3, 1, 1],
    },
  },
  {
    id: "card-005",
    type: "genetics-punnett",
    unit: "고1-생명과학-멘델-양성잡종",
    difficultySeed: 5,
    hint: "AaBb × AaBb — 멘델의 9:3:3:1",
    problem: {
      p1: "AaBb",
      p2: "AaBb",
      traits: [SEED_PEA, SEED_SHAPE],
      expectedRatio: [9, 3, 3, 1],
    },
  },
];

// 런타임 검증 — schema 위반 시 throw.
export const cards: PunnettCard[] = RAW_CARDS.map((raw, i) => {
  const result = PunnettCardSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[genetics-punnett] card ${i} schema invalid: ${result.error.message}`,
    );
  }
  return result.data;
});

export function getCardById(id: string): PunnettCard | undefined {
  return cards.find((c) => c.id === id);
}

export function getCardSequence(): PunnettCard[] {
  return [...cards];
}
