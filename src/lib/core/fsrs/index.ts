// FSRS 백본 — 모든 게임이 공유하는 단일 SRS 엔진 (proc/spec/05 §B 아키텍처).
// 본 모듈은 V1 Phase 1 본 작업에서 ts-fsrs 정식 통합 예정.
// 현재는 게임 모듈이 의존할 수 있는 타입 계약만 정의.

import type { Card as FsrsCard } from "ts-fsrs";

/** 사용자 응답 등급 (ts-fsrs Rating 매핑). */
export type Rating = "again" | "hard" | "good" | "easy";

/**
 * 카드별 SRS 상태. 사용자별 + 카드별로 1개씩 보유.
 * V1: localStorage 저장. V2: 서버 백업 (Vercel KV).
 */
export interface CardSrsState {
  /** ts-fsrs 내부 상태. V1 Phase 1에서 본 통합. */
  fsrsCard: FsrsCard | null;

  /** 누적 리뷰 횟수. */
  reviewCount: number;

  /** 마지막 리뷰 시각. null = 미리뷰. */
  lastReviewAt: Date | null;

  /** retrievability 0~1 (현재 시각 기준 계산값). 추천 알고리즘 입력. */
  R: number;

  /** stability (days). */
  S: number;

  /** difficulty 1~10. */
  D: number;
}

/** 새 카드 진입 시 초기 상태. */
export function createInitialState(): CardSrsState {
  return {
    fsrsCard: null,
    reviewCount: 0,
    lastReviewAt: null,
    R: 1.0,
    S: 0,
    D: 5,
  };
}

/**
 * 카드 리뷰 후 상태 갱신.
 * V1 Phase 1 TODO: ts-fsrs.fsrs().repeat() 통합으로 R/S/D 정식 계산.
 * 현재는 기본값 갱신만.
 */
export function reviewCard(
  state: CardSrsState,
  _rating: Rating,
  now: Date = new Date(),
): CardSrsState {
  return {
    ...state,
    reviewCount: state.reviewCount + 1,
    lastReviewAt: now,
  };
}

/**
 * 우선순위 큐 — 가장 잊기 직전인 카드 N개 선택.
 * V1 Phase 1 TODO: 실제 R 분포 기반 정렬.
 */
export function selectNextCards<T extends { srs: CardSrsState }>(
  cards: T[],
  count: number,
): T[] {
  return [...cards]
    .sort((a, b) => a.srs.R - b.srs.R)
    .slice(0, count);
}
