"use client";

// URL searchParams → GameMode 추출 hook. Plan E §1.A·D3 — URL 단순 패턴.
//
// 사용:
//   const mode = useGameMode(gameId);
//   applyAndPersist(mode, gameId, cardId, outcome);
//   const ordered = selectCardsForMode(withSrs, mode, initialCards.length);
//
// 잘못된 값 / 부재 시 "default".
//
// PR #92 Codex round 4 fix — URL 직접 진입 가드:
//   gameId 가 전달되면 `normalizeModeForGame()` 으로 비지원 mode 를 default 로 정규화.
//   즉 factorization 같은 4 메커니즘 미통합 게임에 `?mode=time-attack` 으로 직접 진입해도
//   hook 이 default 를 반환 → UX 가 default 처럼 깨지는 회귀를 라우트 단에서 차단.
//   gameId 미전달 시(legacy 호출처)는 URL 값만 검증 — 17 호출처가 점진 마이그레이션 가능.

import { useSearchParams } from "next/navigation";
import type { GameMode } from "./index";
import { normalizeModeForGame } from "@/lib/games/supported-modes";

const VALID_MODES: ReadonlyArray<GameMode> = [
  "default",
  "review-queue",
  "time-attack",
  "deep-recall",
];

function isValidGameMode(value: string | null): value is GameMode {
  return value !== null && (VALID_MODES as ReadonlyArray<string>).includes(value);
}

/**
 * URL `?mode=` 쿼리에서 GameMode 추출.
 * @param gameId - 옵션. 전달 시 게임의 지원 모드와 대조해 비지원이면 default 로 정규화.
 *                 4 메커니즘 컴포넌트가 gameId prop 를 받으므로 hook 호출 시 함께 전달.
 */
export function useGameMode(gameId?: string): GameMode {
  const searchParams = useSearchParams();
  const raw = searchParams.get("mode");
  const parsed: GameMode = isValidGameMode(raw) ? raw : "default";
  if (gameId === undefined) return parsed;
  return normalizeModeForGame(gameId, parsed);
}
