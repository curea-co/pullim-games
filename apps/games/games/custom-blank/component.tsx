"use client";

// 사용자 빈칸 — blank 커스텀 카드 → BlankComponent 일반화.

import { useEffect, useState } from "react";
import { BlankComponent } from "@/components/game-mechanics/BlankComponent";
import {
  loadCardsByKind,
  loadCurriculum,
  type CustomBlankCard,
  type CustomCurriculum,
} from "@/lib/core";
import { MANAGE_ENABLED } from "@/lib/features";

const GAME_ID = "custom-blank";

export default function CustomBlankGame() {
  const [cards, setCards] = useState<
    Array<{
      id: string;
      unit: string;
      hint?: string;
      problem: {
        passage: string;
        choices: string[];
        correctIndex: number;
        rationale?: string;
      };
    }>
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const curr = loadCurriculum();
    const currMap = new Map<string, CustomCurriculum>(
      curr.map((c) => [c.id, c]),
    );
    const customCards = loadCardsByKind("blank") as CustomBlankCard[];
    setCards(
      customCards.map((c) => ({
        id: c.id,
        unit: currMap.get(c.curriculumId)?.name ?? "내 단원",
        hint: c.hint,
        problem: {
          passage: c.passage,
          choices: c.choices,
          correctIndex: c.correctIndex,
          rationale: c.rationale,
        },
      })),
    );
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <BlankComponent
      gameId={GAME_ID}
      cards={cards}
      completionMessage={(n) => `${n}개 빈칸, 내 카드로 풀었어요.`}
      emptyMessage={{
        title: "아직 만든 빈칸 카드가 없어요.",
        cta: MANAGE_ENABLED
          ? { label: "관리에서 만들기", href: "/manage/content" }
          : undefined,
      }}
    />
  );
}
