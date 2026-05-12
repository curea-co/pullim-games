"use client";

// 영어 어휘 타이핑 — 한국어 뜻 → 영단어 입력.
// `TypingComponent` (M3 일반화) 그대로 재사용. vocab-typing 패턴과 동일.

import { TypingComponent } from "@/components/game-mechanics/TypingComponent";
import { getCardSequence } from "./content";

export default function EnglishVocabTypingGame() {
  return (
    <TypingComponent
      gameId="english-vocab-typing"
      cards={getCardSequence()}
      completionMessage={(n) => `${n}개 영단어, 기억에 새겨졌어요.`}
    />
  );
}
