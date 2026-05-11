// FSRS 백본 — 모든 게임이 공유하는 단일 SRS 엔진 (proc/spec/05 §B 아키텍처).
// ts-fsrs 4.x 정식 통합. 게임 모듈은 reviewCard / selectNextCards 만 사용.
//
// V0.1: localStorage 저장. V0.2: 서버 백업 (Vercel KV).

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating as FsrsRating,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";

const fsrsInstance = fsrs(generatorParameters());

/** 사용자 응답 등급 — ts-fsrs Grade (Manual 제외) 의 의미 보존 한국어 alias. */
export type Rating = "again" | "hard" | "good" | "easy";

// Rating → Grade (FsrsRating without Manual). 모두 합법한 Grade 값.
const RATING_TO_FSRS: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

/**
 * 카드별 SRS 상태. 사용자별 + 카드별로 1개씩 보유.
 */
export interface CardSrsState {
  /** ts-fsrs 내부 상태. R/S/D 는 여기서 자동 계산. */
  fsrsCard: FsrsCard;
  /** 누적 리뷰 횟수. */
  reviewCount: number;
  /** 마지막 리뷰 시각. null = 미리뷰. */
  lastReviewAt: Date | null;
}

/** 새 카드 진입 시 초기 상태. */
export function createInitialState(now: Date = new Date()): CardSrsState {
  return {
    fsrsCard: createEmptyCard(now),
    reviewCount: 0,
    lastReviewAt: null,
  };
}

/**
 * 카드 리뷰 후 상태 갱신. ts-fsrs 가 R/S/D + 다음 due 자동 계산.
 */
export function reviewCard(
  state: CardSrsState,
  rating: Rating,
  now: Date = new Date(),
): CardSrsState {
  const fsrsRating = RATING_TO_FSRS[rating];
  const result = fsrsInstance.next(state.fsrsCard, now, fsrsRating);
  return {
    fsrsCard: result.card,
    reviewCount: state.reviewCount + 1,
    lastReviewAt: now,
  };
}

/**
 * 카드별 retrievability 계산 (현재 시각 기준).
 * 0~1 — 추천 알고리즘 입력.
 */
export function getRetrievability(
  state: CardSrsState,
  now: Date = new Date(),
): number {
  if (!state.lastReviewAt || state.reviewCount === 0) return 1.0;
  return fsrsInstance.get_retrievability(state.fsrsCard, now, false) as number;
}

/**
 * 우선순위 큐 — 가장 잊기 직전인 카드 N개.
 * R 오름차순 정렬 (낮을수록 먼저 풀어야 함).
 */
export function selectNextCards<T extends { srs: CardSrsState }>(
  cards: T[],
  count: number,
  now: Date = new Date(),
): T[] {
  return [...cards]
    .map((c) => ({
      card: c,
      r: getRetrievability(c.srs, now),
    }))
    .sort((a, b) => a.r - b.r)
    .slice(0, count)
    .map((x) => x.card);
}
