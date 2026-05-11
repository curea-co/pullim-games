"use client";

// 어휘 타이핑 — 뜻풀이 → 한글 음 입력.
// 메커닉 로직은 components/game-mechanics/TypingComponent 가 담당 (M3 일반화).

import { TypingComponent } from "@/components/game-mechanics/TypingComponent";
import { getCardSequence } from "./content";

export default function VocabTypingGame() {
  return (
    <TypingComponent
      gameId="vocab-typing"
      cards={getCardSequence()}
      completionMessage={(n) => `${n}개 어휘, 손가락에 박혔어요.`}
    />
  );
}
