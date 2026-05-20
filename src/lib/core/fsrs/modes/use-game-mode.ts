"use client";

// URL searchParams → GameMode 추출 hook. Plan E §1.A·D3 — URL 단순 패턴.
//
// 사용:
//   const mode = useGameMode();
//   applyAndPersist(mode, gameId, cardId, outcome);
//   const ordered = selectCardsForMode(withSrs, mode, initialCards.length);
//
// 잘못된 값 / 부재 시 "default" — 17 호출처가 인자 없이도 동작.

import { useSearchParams } from "next/navigation";
import type { GameMode } from "./index";

const VALID_MODES: ReadonlyArray<GameMode> = [
  "default",
  "review-queue",
  "time-attack",
  "deep-recall",
];

function isValidGameMode(value: string | null): value is GameMode {
  return value !== null && (VALID_MODES as ReadonlyArray<string>).includes(value);
}

export function useGameMode(): GameMode {
  const searchParams = useSearchParams();
  const raw = searchParams.get("mode");
  return isValidGameMode(raw) ? raw : "default";
}
