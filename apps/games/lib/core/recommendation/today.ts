// "오늘의 추천" 알고리즘 — 모든 게임의 사용자 SRS 상태를 입력으로 1개 게임 추천.
// 핵심 원칙: 가장 잊기 직전인 카드가 속한 게임 우선. 콜드 스타트는 fallback 고정.
//
// 상세: proc/plan/2026-05-08_game-lineup-and-filtering.md §8

import type { CardSrsState } from "../fsrs";
import { getRetrievability } from "../fsrs";

export interface GameSrsSnapshot {
  gameId: string;
  /** 게임 등록된 카드 ids — 사용자가 안 풀어본 신규 카드도 포함. */
  cardIds: string[];
  /** 사용자별 카드 srs 상태. 미리뷰 카드는 entry 없음. */
  states: Map<string, CardSrsState>;
}

export type RecommendationReason =
  | "cold-start"          // 미리뷰 데이터 0
  | "low-retrievability"  // 가장 잊기 직전인 카드 속한 게임
  | "new-cards"           // 사용자가 안 풀어본 카드가 있는 게임
  | "default";            // fallback

export interface Recommendation {
  gameId: string;
  reason: RecommendationReason;
  reasonText: string;
}

/**
 * 오늘의 게임 추천.
 *
 * 우선순위:
 *   1. 가장 잊기 직전인 카드 (R 최소) 속한 게임
 *   2. 사용자가 안 풀어본 카드가 있는 게임
 *   3. fallback 고정 (콜드 스타트)
 */
export function recommendTodaysGame(
  snapshots: GameSrsSnapshot[],
  fallbackGameId: string,
  now: Date = new Date(),
): Recommendation {
  if (snapshots.length === 0) {
    return {
      gameId: fallbackGameId,
      reason: "cold-start",
      reasonText: "처음 만나는 풀림 게임즈",
    };
  }

  // 1. 모든 SRS state 집계 — 카드별 R 계산
  let lowestR = Infinity;
  let lowestGameId: string | null = null;
  let totalReviewed = 0;

  for (const snap of snapshots) {
    for (const [_cardId, state] of snap.states.entries()) {
      if (state.reviewCount === 0) continue;
      totalReviewed += 1;
      const r = getRetrievability(state, now);
      if (r < lowestR) {
        lowestR = r;
        lowestGameId = snap.gameId;
      }
    }
  }

  if (totalReviewed === 0) {
    // 미리뷰 데이터 0 — 콜드 스타트
    return {
      gameId: fallbackGameId,
      reason: "cold-start",
      reasonText: "처음 만나는 풀림 게임즈",
    };
  }

  // 잊기 직전 카드가 충분히 잊혔으면 (R < 0.85) 우선
  if (lowestGameId && lowestR < 0.85) {
    return {
      gameId: lowestGameId,
      reason: "low-retrievability",
      reasonText: "이 단원이 잊혀가고 있어요",
    };
  }

  // 2. 사용자가 안 풀어본 카드가 있는 게임 — 다양성 추구
  for (const snap of snapshots) {
    const reviewedCount = Array.from(snap.states.values()).filter(
      (s) => s.reviewCount > 0,
    ).length;
    if (reviewedCount < snap.cardIds.length) {
      return {
        gameId: snap.gameId,
        reason: "new-cards",
        reasonText: "아직 안 풀어본 카드가 있어요",
      };
    }
  }

  // 3. fallback — 추천할 만한 신호 없음
  return {
    gameId: lowestGameId ?? fallbackGameId,
    reason: "default",
    reasonText: "오늘 한 번 더 풀어볼까요",
  };
}
