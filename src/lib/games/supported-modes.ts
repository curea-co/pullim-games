// 게임별 지원 모드 판정 — Plan E Phase 5 / PR #92 Codex round 1·4 fix.
//
// Codex round 1: time-attack/deep-recall 진입점을 비지원 게임에 일괄 노출하면
// 실제 동작 계약과 어긋난다 (factorization/image-hotspot/chemistry-balance 등은
// TimeAttackTimer/DeepRecallEmpty 통합 없음 → ?mode=time-attack 이 default 처럼 동작).
//
// Codex round 4 (drift 방지 / single source of truth):
//   - 메커니즘 기반 게임 목록을 hard list 로 두면 새 게임 추가 시 여기와 테스트를 동시에
//     갱신하지 않는 순간 진입점이 조용히 사라진다.
//   - `manifest.meta.mechanismComponent` 필드를 single source of truth 로 채택.
//     게임이 4 메커니즘 컴포넌트 중 하나를 사용한다면 manifest 한 곳에서 명시한다.
//     본 모듈·테스트·e2e 가 registry 에서 도출하므로 drift 가 발생하지 않는다.
//
// Codex round 4 (URL 직접 진입 가드):
//   - isModeSupportedFor 는 UI 노출 외에 라우트/훅 단에서도 호출되어
//     `?mode=time-attack` 직접 진입을 default 로 정규화해야 한다.
//     → `useGameMode(gameId)` 가 `normalizeModeForGame()` 으로 가드 (use-game-mode.ts).
//
// 판정 기준:
//   - default       : 모든 게임 지원 (FSRS 백본 공통).
//   - review-queue  : 모든 게임 지원 (selectCardsForMode 가 SRS 위에서만 동작 — 모든 게임 useGameMode 사용).
//   - time-attack   : 메커니즘 기반 게임만 — TimeAttackTimer UI 필수.
//   - deep-recall   : 메커니즘 기반 게임만 — DeepRecallEmpty 빈풀 UX 필수.

import type { GameMode } from "@/lib/core";
import { games } from "./registry";

/**
 * 4 메커니즘 컴포넌트(Blank/QuickQuiz/Typing/WordMatch) 기반 게임 id 목록.
 * 이 게임들만 time-attack 타이머와 deep-recall 빈 풀 UX 가 보장된다.
 *
 * Single source of truth = `manifest.meta.mechanismComponent` 필드.
 * 새 메커니즘 게임 추가 시 manifest 한 곳만 갱신하면 자동 반영 (drift 차단).
 *
 * 직접 게임 12종 (factorization, image-hotspot, chemistry-balance, …) 은
 * useGameMode 만 호출하므로 review-queue 까지만 지원 — manifest 에 mechanismComponent 누락.
 */
export function getMechanismBasedGameIds(): readonly string[] {
  return games
    .filter((g) => g.meta.mechanismComponent !== undefined)
    .map((g) => g.meta.id);
}

/**
 * 게임이 4 메커니즘 컴포넌트 기반인지 — time-attack/deep-recall UX 보장 여부.
 * registry 에서 manifest.meta.mechanismComponent 필드를 도출한다.
 */
export function isMechanismBasedGame(gameId: string): boolean {
  const game = games.find((g) => g.meta.id === gameId);
  return game?.meta.mechanismComponent !== undefined;
}

/**
 * 특정 게임이 주어진 모드를 지원하는가.
 * UI 진입점 노출/비활성 + 라우트 가드 양쪽에 사용.
 *
 * Codex round 4 fix — `useGameMode(gameId)` 에서 본 헬퍼로 비지원 mode 를
 * default 로 정규화해 `?mode=time-attack` 직접 URL 진입 회귀를 차단한다.
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

/**
 * 비지원 모드는 default 로 정규화 — Codex round 4 fix (URL 직접 진입 가드).
 *
 * `useGameMode(gameId)` 가 URL 파라미터를 검증할 때 호출한다. 4 메커니즘 미통합 게임에
 * `?mode=time-attack`/`?mode=deep-recall` 로 직접 진입해도 hook 이 default 를 반환해
 * UX 가 default 처럼 깨지는 회귀를 차단한다.
 */
export function normalizeModeForGame(
  gameId: string,
  mode: GameMode,
): GameMode {
  return isModeSupportedFor(gameId, mode) ? mode : "default";
}
