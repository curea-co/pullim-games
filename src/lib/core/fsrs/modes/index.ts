// 게임 모드 wrapper — FSRS 백본 위에 모드별 rating 결정 책임 분리.
// plan: proc/plan/2026-05-18_fsrs-backbone.md §3 Phase 1
//
// 단일 백본 + 다중 게임 모드 아키텍처:
// - FSRS 백본(fsrs/index.ts)은 알고리즘만 — Rating → 다음 SRS 상태.
// - 모드 wrapper(이 파일)는 outcome(정답/오답·wrongCount·hintUsed·elapsedMs) → Rating 결정.
// - 게임 컴포넌트는 outcome 만 넘김 — 모드 추가 시 호출처 재수정 X.

import {
  type CardSrsState,
  type Rating,
  reviewCard,
} from "@/lib/core/fsrs";
import {
  loadSrsState,
  saveSrsAndRecord,
} from "@/lib/core/storage/srs";

/**
 * 게임 모드. Phase 1은 'default' 만 정식 구현, 나머지는 확장 포인트.
 * - default: 1정답 → good, 1오답 → again (현 21 게임 표준 패턴).
 * - review-queue: due-soon 우선 N개 카드 (V0.4+).
 * - time-attack: 시간 제한 — 빠른 정답 → easy (V0.4+).
 * - deep-recall: getRetrievability 낮은 카드 반복 (V0.4+).
 */
export type GameMode =
  | "default"
  | "review-queue"
  | "time-attack"
  | "deep-recall";

/**
 * 게임 컴포넌트에서 모드 wrapper로 넘기는 신호.
 * default 모드는 correct + wrongCount + hintUsed 만 사용. elapsedMs는 time-attack 진입 시.
 */
export interface ReviewOutcome {
  /** 정답 여부. reveal(자동 정답 노출) 트리거는 correct=false 로 전달. */
  correct: boolean;
  /** 정답 전까지 누적 오답 횟수. 0은 첫 시도 정답. */
  wrongCount: number;
  /** 힌트 사용 여부. 메커닉별 의미 다를 수 있음 — Typing은 letter-reveal 힌트, QuickQuiz는 보기 줄임 등. */
  hintUsed: boolean;
  /** time-attack 모드용 응답 소요 ms. default 모드에서는 무시. */
  elapsedMs?: number;
}

/**
 * 모드 + outcome → Rating 결정. 순수.
 *
 * default 모드 규칙:
 * - !correct → again (reveal 자동 정답 케이스)
 * - correct + hintUsed → hard
 * - correct + wrongCount === 0 → good
 * - correct + wrongCount === 1 → hard
 * - correct + wrongCount >= 2 → again
 */
const warnedModes = new Set<GameMode>();

export function resolveRating(
  mode: GameMode,
  outcome: ReviewOutcome,
): Rating {
  if (mode !== "default") {
    // 비-default 모드는 별 plan에서 정식 구현. default fallback + 조기 버그 감지 경고.
    // Plan A C4 — silent default fallback이 향후 모드 구현 시 회귀 마스킹 위험.
    // dev 환경에서 1회만 경고 (운영 콘솔 스팸 회피).
    if (
      process.env.NODE_ENV !== "production" &&
      typeof console !== "undefined" &&
      !warnedModes.has(mode)
    ) {
      warnedModes.add(mode);
      console.warn(
        `[fsrs/modes] resolveRating("${mode}") not implemented — default fallback. ` +
          `Implement before relying on this mode in production.`,
      );
    }
    return resolveRating("default", outcome);
  }
  if (!outcome.correct) return "again";
  if (outcome.hintUsed) return "hard";
  if (outcome.wrongCount === 0) return "good";
  if (outcome.wrongCount === 1) return "hard";
  return "again";
}

/**
 * 모드 적용 후 다음 SRS 상태. 순수.
 * prev mutate X — 새 객체 반환.
 */
export function applyReview(
  mode: GameMode,
  prev: CardSrsState,
  outcome: ReviewOutcome,
  now: Date = new Date(),
): CardSrsState {
  const rating = resolveRating(mode, outcome);
  return reviewCard(prev, rating, now);
}

/**
 * I/O wrapper — load → applyReview → saveSrsAndRecord (streak 동거).
 * 게임 컴포넌트는 이 함수만 호출. rating 결정 책임 모드 wrapper로 위임.
 *
 * @returns 갱신된 SRS 상태 (호출처가 후속 UI 갱신에 사용 가능).
 */
export function applyAndPersist(
  mode: GameMode,
  gameId: string,
  cardId: string,
  outcome: ReviewOutcome,
  now: Date = new Date(),
): CardSrsState {
  const prev = loadSrsState(gameId, cardId);
  const next = applyReview(mode, prev, outcome, now);
  saveSrsAndRecord(gameId, cardId, next);
  return next;
}
