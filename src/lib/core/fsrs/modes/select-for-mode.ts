// 모드별 카드 선택 wrapper. Plan E §2.
//
// review-queue (Phase 2): D1.1 임시 N=5. 사용자 합의 시 변경.
// deep-recall (Phase 4): D1.5 — R < 0.6 카드만 풀로. 빈 풀은 빈 배열 반환 (호출처가 안내 화면 처리).
// time-attack (Phase 3): 카드 선택 자체는 default (fallbackCount) — rating 결정만 다름.
//
// 정책 일치성:
//   - selectNextCards 가 R 오름차순 정렬 → deep-recall 필터 후 가장 잊혀가는 카드 우선.
//   - fallbackCount 보존 → 16 호출처 시그니처 무변경.

import {
  getRetrievability,
  selectNextCards,
  type CardSrsState,
} from "@/lib/core/fsrs";
import type { GameMode } from "./index";

const REVIEW_QUEUE_DEFAULT_N = 5;
const DEEP_RECALL_R_THRESHOLD = 0.6;

export function selectCardsForMode<T extends { srs: CardSrsState }>(
  cards: T[],
  mode: GameMode,
  fallbackCount: number,
  now: Date = new Date(),
): T[] {
  // deep-recall: R<0.6 카드만 풀 — 빈 풀 시 빈 배열 반환 (호출처 안내 화면).
  if (mode === "deep-recall") {
    const filtered = cards.filter(
      (c) => getRetrievability(c.srs, now) < DEEP_RECALL_R_THRESHOLD,
    );
    return selectNextCards(filtered, filtered.length, now);
  }

  const count =
    mode === "review-queue"
      ? Math.min(REVIEW_QUEUE_DEFAULT_N, cards.length)
      : fallbackCount;
  return selectNextCards(cards, count, now);
}
