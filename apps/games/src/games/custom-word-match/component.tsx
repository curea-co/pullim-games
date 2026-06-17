"use client";

// 사용자 매칭 — word-match 커스텀 카드 → WordMatchComponent 일반화.

import { useEffect, useState } from "react";
import { WordMatchComponent } from "@/components/game-mechanics/WordMatchComponent";
import {
  loadCardsByKind,
  loadCurriculum,
  type CustomCurriculum,
  type CustomWordMatchCard,
} from "@/lib/core";

const GAME_ID = "custom-word-match";

export default function CustomWordMatchGame() {
  const [cards, setCards] = useState<
    Array<{
      id: string;
      unit: string;
      hint?: string;
      problem: { pairs: { left: string; right: string }[] };
    }>
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const curr = loadCurriculum();
    const currMap = new Map<string, CustomCurriculum>(
      curr.map((c) => [c.id, c]),
    );
    const customCards = loadCardsByKind("word-match") as CustomWordMatchCard[];
    setCards(
      customCards.map((c) => ({
        id: c.id,
        unit: currMap.get(c.curriculumId)?.name ?? "내 단원",
        hint: c.hint,
        problem: {
          pairs: c.pairs,
        },
      })),
    );
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <WordMatchComponent
      gameId={GAME_ID}
      cards={cards}
      completionMessage={(n) => `${n}묶음, 내 카드로 풀었어요.`}
      emptyMessage={{
        title: "아직 만든 매칭 카드가 없어요.",
        cta: { label: "관리에서 만들기", href: "/manage/content" },
      }}
    />
  );
}
