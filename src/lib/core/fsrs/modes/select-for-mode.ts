// 모드별 카드 선택 wrapper. Plan E §2 — review-queue 진입 시 due-soon 우선 작은 N.
//
// review-queue: D1.1 임시 N=5. 사용자 합의 시 변경 (plan §2 D1.1 잔존).
// 그 외 모드: fallbackCount 그대로 (기존 동작 보존).

import { selectNextCards, type CardSrsState } from "@/lib/core/fsrs";
import type { GameMode } from "./index";

const REVIEW_QUEUE_DEFAULT_N = 5;

export function selectCardsForMode<T extends { srs: CardSrsState }>(
  cards: T[],
  mode: GameMode,
  fallbackCount: number,
  now: Date = new Date(),
): T[] {
  const count =
    mode === "review-queue"
      ? Math.min(REVIEW_QUEUE_DEFAULT_N, cards.length)
      : fallbackCount;
  return selectNextCards(cards, count, now);
}
