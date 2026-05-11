"use client";

// 사용자 타이핑 — typing 커스텀 카드 → TypingComponent 일반화.

import { useEffect, useState } from "react";
import { TypingComponent } from "@/components/game-mechanics/TypingComponent";
import {
  loadCardsByKind,
  loadCurriculum,
  type CustomCurriculum,
  type CustomTypingCard,
} from "@/lib/core";

const GAME_ID = "custom-typing";

export default function CustomTypingGame() {
  const [cards, setCards] = useState<
    Array<{
      id: string;
      unit: string;
      hint?: string;
      problem: { meaning: string; answer: string; pronunciation?: string };
    }>
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const curr = loadCurriculum();
    const currMap = new Map<string, CustomCurriculum>(
      curr.map((c) => [c.id, c]),
    );
    const customCards = loadCardsByKind("typing") as CustomTypingCard[];
    setCards(
      customCards.map((c) => ({
        id: c.id,
        unit: currMap.get(c.curriculumId)?.name ?? "내 단원",
        hint: c.hint,
        problem: {
          meaning: c.meaning,
          answer: c.answer,
          pronunciation: c.pronunciation,
        },
      })),
    );
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <TypingComponent
      gameId={GAME_ID}
      cards={cards}
      completionMessage={(n) => `${n}개 어휘, 내 카드를 풀었어요.`}
      emptyMessage={{
        title: "아직 만든 타이핑 카드가 없어요.",
        cta: { label: "관리에서 만들기", href: "/manage/content" },
      }}
    />
  );
}
