"use client";

// 영단어 매칭 — WordMatchComponent 메커니즘 활용.
// plan: proc/plan/2026-05-19_plan-c-distractor-policy-and-mechanism-unify.md Phase 2.
// 이전: 380 LOC 직접 구현 (seededShuffle·매칭 검증·extras 로직 자체 보유).
// 이후: WordMatchComponent + extras prop 으로 일반화 + 본 wrapper 30 LOC.

import { useMemo } from "react";
import {
  WordMatchComponent,
  type WordMatchCardLike,
} from "@/components/game-mechanics/WordMatchComponent";
import { getCardSequence } from "./content";
import type { WordMatchCard } from "./schema";

const GAME_ID = "english-word-match";

function toWordMatchCard(card: WordMatchCard): WordMatchCardLike {
  return {
    id: card.id,
    unit: card.unit,
    hint: card.hint,
    problem: {
      pairs: card.problem.pairs.map((p) => ({
        left: p.english,
        right: p.korean,
      })),
      extras: card.problem.extras
        ? {
            left: card.problem.extras.english,
            right: card.problem.extras.korean,
          }
        : undefined,
    },
  };
}

export default function EnglishWordMatchGame() {
  const cards = useMemo(
    () => getCardSequence().map(toWordMatchCard),
    [],
  );
  return (
    <WordMatchComponent
      gameId={GAME_ID}
      cards={cards}
      completionMessage={(n) => `${n}장의 단어를 모두 맞췄어요`}
      completionSubtext="내일 또 봐요."
      homeHref="/"
    />
  );
}
