// 슬롯 배치 vs 정답 slot-by-slot 비교.
// 부분 정확도 산출 — wrong phase 정확도 표시 + FSRS rating 결정.

import type { Slot } from "../schema";

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
 */
export function checkAssembly(
  placements: (string | null)[],
  slots: Slot[],
): AssemblyResult {
  if (placements.length !== slots.length) {
    throw new Error(
      `[letter-assembly] placements length ${placements.length} != slots length ${slots.length}`,
    );
  }
  const perSlot = slots.map((s, i) => placements[i] === s.correctCardId);
  const correctCount = perSlot.filter(Boolean).length;
  return {
    allCorrect: correctCount === slots.length,
    correctCount,
    totalCount: slots.length,
    perSlot,
  };
}
