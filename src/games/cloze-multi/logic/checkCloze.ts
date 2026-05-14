// 학생 배치 vs 정답 blank-by-blank 비교.
// 부분 정확도 산출 — wrong phase 정확도 표시 + FSRS rating 결정에 활용.

import type { BlankSlot } from "../schema";

export interface ClozeResult {
  /** 모든 빈칸이 정답이면 true. */
  allCorrect: boolean;
  /** 정답 빈칸 수. */
  correctCount: number;
  /** 총 빈칸 수. */
  totalCount: number;
  /** 빈칸별 정/오 결과 (UI 색칠용 — wrong 시 노출 X, 정확도만). */
  perBlank: boolean[];
}

/**
 * @param placements blanks 와 같은 순서로 배치된 cardId. null = 미배치.
 * @param blanks 카드 슬롯 정의 (correctCardId 가 정답).
 */
export function checkCloze(
  placements: (string | null)[],
  blanks: BlankSlot[],
): ClozeResult {
  if (placements.length !== blanks.length) {
    throw new Error(
      `[cloze-multi] placements length ${placements.length} != blanks length ${blanks.length}`,
    );
  }
  const perBlank = blanks.map((b, i) => placements[i] === b.correctCardId);
  const correctCount = perBlank.filter(Boolean).length;
  return {
    allCorrect: correctCount === blanks.length,
    correctCount,
    totalCount: blanks.length,
    perBlank,
  };
}
