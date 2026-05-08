"use client";

// 수학 빠른 퀴즈 — 4지선다, 30초~1분 세션.
// 메커닉 로직은 components/game-mechanics/QuickQuizComponent 가 담당.

import { QuickQuizComponent } from "@/components/game-mechanics/QuickQuizComponent";
import { getCardSequence } from "./content";

export default function MathQuickQuiz() {
  return (
    <QuickQuizComponent
      gameId="math-quick-quiz"
      cards={getCardSequence()}
      completionMessage={(n) => `${n}문제, 빠르게 끝났어요.`}
    />
  );
}
