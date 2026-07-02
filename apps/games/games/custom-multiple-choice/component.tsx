"use client";

// 사용자 객관식 — multiple-choice 커스텀 카드 → QuickQuizComponent 일반화.

import { useEffect, useState } from "react";
import { QuickQuizComponent } from "@/components/game-mechanics/QuickQuizComponent";
import {
  loadCardsByKind,
  loadCurriculum,
  type CustomCurriculum,
  type CustomMultipleChoiceCard,
} from "@/lib/core";
import { MANAGE_ENABLED } from "@/lib/features";

const GAME_ID = "custom-multiple-choice";

export default function CustomMultipleChoiceGame() {
  const [cards, setCards] = useState<
    Array<{
      id: string;
      unit: string;
      hint?: string;
      problem: {
        question: string;
        choices: string[];
        correctIndex: number;
      };
    }>
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const curr = loadCurriculum();
    const currMap = new Map<string, CustomCurriculum>(
      curr.map((c) => [c.id, c]),
    );
    const customCards = loadCardsByKind("multiple-choice") as CustomMultipleChoiceCard[];
    setCards(
      customCards.map((c) => ({
        id: c.id,
        unit: currMap.get(c.curriculumId)?.name ?? "내 단원",
        hint: c.hint,
        problem: {
          question: c.question,
          choices: c.choices,
          correctIndex: c.correctIndex,
        },
      })),
    );
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <QuickQuizComponent
      gameId={GAME_ID}
      cards={cards}
      completionMessage={(n) => `${n}문제, 내 카드를 풀었어요.`}
      emptyMessage={{
        title: "아직 만든 객관식 카드가 없어요.",
        cta: MANAGE_ENABLED
          ? { label: "관리에서 만들기", href: "/manage/content" }
          : undefined,
      }}
    />
  );
}
