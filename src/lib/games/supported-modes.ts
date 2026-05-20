// 게임별 지원 모드 판정 — Plan E Phase 5 (PR #92 Codex round 1 fix).
//
// Codex 지적: time-attack/deep-recall 진입점을 비지원 게임에까지 일괄 노출하면
// 실제 동작 계약과 어긋난다 (factorization/image-hotspot/chemistry-balance 등은
// TimeAttackTimer/DeepRecallEmpty 통합 없음 → ?mode=time-attack 이 default 처럼 동작).
//
// 판정 기준:
//   - default       : 모든 게임 지원 (FSRS 백본 공통).
//   - review-queue  : 모든 게임 지원 (selectCardsForMode 가 SRS 위에서만 동작 — 모든 게임 useGameMode 사용).
//   - time-attack   : 4 메커니즘 컴포넌트 (Blank/QuickQuiz/Typing/WordMatch) 통합 게임만 — TimeAttackTimer UI 필수.
//   - deep-recall   : 4 메커니즘 컴포넌트 통합 게임만 — DeepRecallEmpty 빈풀 UX 필수.
//
// V1 단계의 hard list. 향후 게임이 자체 TimeAttackTimer/DeepRecallEmpty 를 통합하면
// 매니페스트의 명시적 supportedModes 필드로 이전 (현 단계는 4 메커니즘 통합 = 지원이라는
// 명료한 룰만 유지).

import type { GameMode } from "@/lib/core";

/**
 * 4 메커니즘 컴포넌트(Blank/QuickQuiz/Typing/WordMatch) 기반 게임 id 목록.
 * 이 게임들만 time-attack 타이머와 deep-recall 빈 풀 UX 가 보장된다.
 *
 * 직접 게임 12종 (factorization, image-hotspot, chemistry-balance, …) 은
 * useGameMode 만 호출하므로 review-queue 까지만 지원.
 */
const MECHANISM_BASED_GAME_IDS = new Set<string>([
  "math-quick-quiz",
  "english-blank",
  "english-vocab-typing",
  "english-word-match",
  "vocab-typing",
  "custom-blank",
  "custom-multiple-choice",
  "custom-typing",
  "custom-word-match",
]);

/**
 * 게임이 4 메커니즘 컴포넌트 기반인지 — time-attack/deep-recall UX 보장 여부.
 * Plan E Phase 5+ 에서 직접 게임에 TimeAttackTimer 가 통합되면 이 hard list 를
 * manifest.meta.supportedModes 로 이전한다.
 */
export function isMechanismBasedGame(gameId: string): boolean {
  return MECHANISM_BASED_GAME_IDS.has(gameId);
}

/**
 * 특정 게임이 주어진 모드를 지원하는가.
 * UI 진입점 노출/비활성 판단에 사용 — 비지원 모드 chip 은 노출 차단.
 */
export function isModeSupportedFor(gameId: string, mode: GameMode): boolean {
  if (mode === "default") return true;
  if (mode === "review-queue") return true;
  // time-attack / deep-recall 은 4 메커니즘 컴포넌트 통합 게임만.
  return isMechanismBasedGame(gameId);
}

/**
 * 게임이 지원하는 모드 셋 — UI nav 에서 chip 노출 필터링에 사용.
 * default 는 게임 본 진입(?mode 미지정) 이라 보조 chip 에서는 제외.
 */
export function getAuxiliaryModesFor(gameId: string): GameMode[] {
  const candidates: GameMode[] = ["review-queue", "time-attack", "deep-recall"];
  return candidates.filter((mode) => isModeSupportedFor(gameId, mode));
}
