// 인수분해 카드 풀 — V0.2: 공통인수 메커닉 5장.
// AST 기반 buildCard helper 가 polynomial 문자열에서 UI Term[] + factoredForm 자동 도출.
// 콘텐츠 큐레이터는 polynomial + difficulty 만 넣으면 됨.
//
// V0.3+: 다른 인수분해 기법 (sum-product, 삼차차, 치환) 추가 시 별도 game id 분리 검토.

import { buildCard } from "../logic/buildCard";
import { FactorizationCardSchema } from "../schema";
import type { FactorizationCard } from "../schema";

const RAW_CARDS = [
  buildCard({
    id: "card-001",
    unit: "고1-인수분해-공통인수",
    difficultySeed: 1,
    hint: "공통인수를 찾아 끌어내세요",
    polynomial: "2x + 4",
  }),
  buildCard({
    id: "card-002",
    unit: "고1-인수분해-공통인수",
    difficultySeed: 2,
    hint: "공통인수를 찾아 끌어내세요",
    polynomial: "3x + 9",
  }),
  buildCard({
    id: "card-003",
    unit: "고1-인수분해-공통인수",
    difficultySeed: 3,
    hint: "공통인수가 항 일부에 숨어있어요",
    polynomial: "4x + 6",
  }),
  buildCard({
    id: "card-004",
    unit: "고1-인수분해-공통인수",
    difficultySeed: 4,
    hint: "공통인수에 변수도 포함돼요",
    polynomial: "6x² + 8x",
  }),
  buildCard({
    id: "card-005",
    unit: "고1-인수분해-공통인수",
    difficultySeed: 5,
    hint: "가장 큰 공통인수를 끌어내세요",
    polynomial: "12x² + 18x",
  }),
];

// 런타임 검증 — schema 위반 시 throw (silent miscompute 차단).
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

/** 5문제 시퀀스 — V0.2 in-order. V0.3 FSRS 우선순위 큐 통합. */
export function getCardSequence(): FactorizationCard[] {
  return [...cards];
}

/** V0.1 호환용 — 첫 카드. */
export function getNextCard(): FactorizationCard {
  return cards[0]!;
}
