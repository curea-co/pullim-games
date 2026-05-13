// 학생 배치 vs 정답 비교. 카드별 categoryId 일치 검증.
// 정확도 산출 — wrong 시 표시 + FSRS rating 결정.

import type { Item } from "../schema";

export interface AssignmentResult {
  allCorrect: boolean;
  correctCount: number;
  totalCount: number;
  /** itemId → 정/오 (UI 색칠용, 단 답지 노출 회피로 wrong 시 표시 X). */
  perItem: Record<string, boolean>;
}

export function checkAssignments(
  assignments: Record<string, string | null>,
  items: Item[],
): AssignmentResult {
  const perItem: Record<string, boolean> = {};
  let correctCount = 0;
  for (const item of items) {
    const placed = assignments[item.id] ?? null;
    const ok = placed === item.categoryId;
    perItem[item.id] = ok;
    if (ok) correctCount += 1;
  }
  return {
    allCorrect: correctCount === items.length,
    correctCount,
    totalCount: items.length,
    perItem,
  };
}
