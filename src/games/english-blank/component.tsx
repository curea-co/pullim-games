"use client";

// 영어 빈칸 추론 — 본문 + 4지선다.
// 메커닉 로직은 components/game-mechanics/BlankComponent 가 담당 (M3 일반화).

import { BlankComponent } from "@/components/game-mechanics/BlankComponent";
import { getCardSequence } from "./content";

export default function EnglishBlankGame() {
  return (
    <BlankComponent
      gameId="english-blank"
      cards={getCardSequence()}
      completionMessage={(n) => `${n}개 빈칸, 글의 흐름이 보였어요.`}
    />
  );
}
