// 카드 풀 — 빌드 타임 정적 import + zod 런타임 검증.
// V0.1: card-001 만. V0.2부터 5장 전부.

import {
  FactorizationCardSchema,
  type FactorizationCard,
} from "../schema";
import card001 from "./cards/card-001.json";

const RAW_CARDS = [card001];

// 런타임 검증 — schema 위반 시 즉시 throw (silent miscompute 차단).
export const cards: FactorizationCard[] = RAW_CARDS.map((raw, i) => {
  const result = FactorizationCardSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[factorization] card ${i} schema invalid: ${result.error.message}`,
    );
  }
  return result.data;
});

export function getCardById(id: string): FactorizationCard | undefined {
  return cards.find((c) => c.id === id);
}

/** V0.1: 항상 첫 카드. V0.2: FSRS 우선순위 큐 통합. */
export function getNextCard(): FactorizationCard {
  return cards[0]!;
}
