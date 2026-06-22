// 슬롯 배치 vs 정답 slot-by-slot 비교.
// 부분 정확도 산출 — wrong phase 정확도 표시 + FSRS rating 결정.
//
// text 기준 비교: 동일 부수 카드 (예: 木 + 木 = 林) 가 schema 상 다른 cardId
// (c-mok-1, c-mok-2) 라도 시각적으로 동일하면 어느 슬롯이든 정답 처리.
// audit BUG-1 fix.

import type { ComponentCard, Slot } from "../schema";

export interface AssemblyResult {
  /** 모든 슬롯이 정답이면 true. */
  allCorrect: boolean;
  /** 정답 슬롯 수. */
  correctCount: number;
  /** 총 슬롯 수. */
  totalCount: number;
  /** 슬롯별 정/오 (wrong 시 노출 X — 정확도만). */
  perSlot: boolean[];
}

/**
 * @param placements slots 와 같은 순서로 배치된 cardId. null = 미배치.
 * @param slots 정답 slot 정의 (correctCardId 의 text 가 정답).
 * @param cards 전체 카드 풀 — cardId → text 매핑용.
 */
export function checkAssembly(
  placements: (string | null)[],
  slots: Slot[],
  cards: ComponentCard[],
): AssemblyResult {
  if (placements.length !== slots.length) {
    throw new Error(
      `[letter-assembly] placements length ${placements.length} != slots length ${slots.length}`,
    );
  }
  const textById = new Map(cards.map((c) => [c.id, c.text]));
  const perSlot = slots.map((s, i) => {
    const placedId = placements[i];
    if (!placedId) return false;
    const placedText = textById.get(placedId);
    const correctText = textById.get(s.correctCardId);
    return placedText !== undefined && placedText === correctText;
  });
  const correctCount = perSlot.filter(Boolean).length;
  return {
    allCorrect: correctCount === slots.length,
    correctCount,
    totalCount: slots.length,
    perSlot,
  };
}
