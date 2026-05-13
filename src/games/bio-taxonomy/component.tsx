"use client";

// 생물 분류 트리 — 카드 탭 (active) → 카테고리 박스 탭 (배치) → "정답 확인".
// 답지 노출 X (wrong 시 카드별 정/오 강조 X, 정확도 n/m 만 노출).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CategoryBox } from "./components/CategoryBox";
import { ItemCard } from "./components/ItemCard";
import { checkAssignments } from "./logic/checkAssignments";
import { getCardSequence } from "./content";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "bio-taxonomy";
type Phase = "playing" | "checking" | "correct" | "wrong" | "completed";

export default function BioTaxonomyGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    {},
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [accuracy, setAccuracy] = useState<{
    correct: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const all = loadAllSrsStates(GAME_ID);
    const allCards = getCardSequence();
    if (all.size > 0) {
      const withSrs = allCards.map((c) => ({
        card: c,
        srs: all.get(c.id) ?? loadSrsState(GAME_ID, c.id),
      }));
      const ordered = selectNextCards(withSrs, allCards.length).map(
        (x) => x.card,
      );
      setCards(ordered);
    }
    void logEvent({ gameId: GAME_ID, cardId: null, action: "session-start" });
    return () => {
      void logEvent({ gameId: GAME_ID, cardId: null, action: "session-end" });
    };
  }, []);

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  useEffect(() => {
    if (!card) return;
    const initial: Record<string, string | null> = {};
    for (const item of card.problem.items) {
      initial[item.id] = null;
    }
    setAssignments(initial);
    setActiveItemId(null);
    setWrongCount(0);
    setAccuracy(null);
    setPhase("playing");
  }, [cardIndex, card]);

  const poolItems = useMemo(() => {
    if (!card) return [];
    return card.problem.items.filter((it) => !assignments[it.id]);
  }, [card, assignments]);

  const itemsByCategory = useMemo(() => {
    const map: Record<string, typeof card.problem.items> = {};
    if (!card) return map;
    for (const cat of card.problem.categories) {
      map[cat.id] = card.problem.items.filter(
        (it) => assignments[it.id] === cat.id,
      );
    }
    return map;
  }, [card, assignments]);

  const allPlaced = useMemo(() => {
    if (!card) return false;
    return card.problem.items.every((it) => assignments[it.id] != null);
  }, [card, assignments]);

  if (phase === "completed") {
    return (
      <CompletionScreen
        totalCards={cards.length}
        onRetry={() => {
          setCardIndex(0);
          void logEvent({
            gameId: GAME_ID,
            cardId: null,
            action: "session-start",
            payload: { retry: true },
          });
        }}
      />
    );
  }

  if (!card) return null;

  function selectFromPool(itemId: string) {
    if (phase !== "playing") return;
    setActiveItemId((cur) => (cur === itemId ? null : itemId));
  }

  function unassign(itemId: string) {
    if (phase !== "playing") return;
    setAssignments((prev) => ({ ...prev, [itemId]: null }));
    setActiveItemId(itemId);
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { itemId, categoryId: null },
    });
  }

  function placeIntoCategory(categoryId: string) {
    if (phase !== "playing" || activeItemId === null) return;
    const current = activeItemId;
    setAssignments((prev) => ({ ...prev, [current]: categoryId }));
    setActiveItemId(null);
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { itemId: current, categoryId },
    });
  }

  function handleCheck() {
    if (phase !== "playing" || !allPlaced) return;
    setPhase("checking");
    const result = checkAssignments(assignments, card!.problem.items);
    setAccuracy({ correct: result.correctCount, total: result.totalCount });

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: {
        correct: result.allCorrect,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
      },
    });

    setTimeout(() => {
      if (result.allCorrect) {
        const rating =
          wrongCount === 0 ? "good" : wrongCount <= 1 ? "hard" : "again";
        const prev = loadSrsState(GAME_ID, card!.id);
        const updated = reviewCard(prev, rating);
        saveSrsState(GAME_ID, card!.id, updated);
        setPhase("correct");
      } else {
        setWrongCount((w) => w + 1);
        setPhase("wrong");
        setTimeout(() => setPhase("playing"), 1200);
      }
    }, 200);
  }

  function handleNext() {
    if (isLastCard) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
  }

  const disabled = phase !== "playing";
  const receivable = activeItemId !== null;

  return (
    <GameShell
      variant="split"
      header={
        <div className="flex items-center justify-between text-label tabular text-type-secondary">
          <span>
            {cardIndex + 1} / {cards.length}
          </span>
          <Link
            href="/"
            aria-label="메인으로"
            className="rounded-button px-2 py-1 hover:text-type-primary"
          >
            ≡
          </Link>
        </div>
      }
      content={
        <>
          <p className="mt-6 text-helper text-type-secondary lg:mt-0">
            {card.unit}
          </p>
          <h1 className="mt-2 text-display text-type-primary">
            {card.problem.title}
          </h1>
          {card.hint && (
            <p className="mt-1 text-helper text-type-secondary">
              힌트 · {card.hint}
            </p>
          )}

          {/* 카테고리 박스들 */}
          <motion.div
            className={`mt-6 grid gap-2 ${
              card.problem.categories.length === 2
                ? "grid-cols-2"
                : card.problem.categories.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2 lg:grid-cols-4"
            }`}
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
            {card.problem.categories.map((cat, idx) => (
              <CategoryBox
                key={cat.id}
                category={cat}
                colorIndex={idx}
                items={itemsByCategory[cat.id] ?? []}
                activeItemId={activeItemId}
                receivable={receivable}
                disabled={disabled}
                onReceive={() => placeIntoCategory(cat.id)}
                onUnassign={unassign}
              />
            ))}
          </motion.div>

          {/* 풀 (미배치 카드) */}
          <div
            className="mt-6 rounded-block border border-border-hairline bg-bg-block p-3"
            aria-label="카드 풀"
          >
            <p className="text-helper text-type-secondary">
              {poolItems.length > 0
                ? "카드를 골라서 위 카테고리에 넣어주세요"
                : "모든 카드를 배치했어요"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {poolItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  placed={false}
                  categoryColorIndex={null}
                  active={activeItemId === item.id}
                  disabled={disabled}
                  onSelect={() => selectFromPool(item.id)}
                />
              ))}
            </div>
          </div>

          <p
            className="mt-3 text-center text-helper text-type-secondary"
            aria-hidden="true"
          >
            {phase === "wrong" && accuracy
              ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
              : phase === "correct"
                ? "모든 카드가 알맞은 분류에 들어갔어요"
                : activeItemId !== null
                  ? "카테고리 라벨을 탭해서 배치하세요"
                  : "카드를 탭한 뒤 카테고리에 배치하세요"}
          </p>
          {wrongCount > 0 && phase !== "correct" && (
            <p className="mt-1 text-center text-helper tabular text-type-secondary">
              오답 {wrongCount}회
            </p>
          )}
        </>
      }
      cta={
        phase === "correct" ? (
          <button
            type="button"
            onClick={handleNext}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10"
          >
            {isLastCard ? "마치기 →" : "다음 →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCheck}
            disabled={phase !== "playing" || !allPlaced}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            정답 확인
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" &&
            (activeItemId === null
              ? "카드를 탭한 뒤 카테고리에 배치하세요"
              : "카테고리 라벨을 탭해서 배치하세요")}
          {phase === "wrong" && accuracy
            ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
            : ""}
          {phase === "correct" && "모든 카드가 알맞은 분류에 들어갔어요"}
        </span>
      }
    />
  );
}

interface CompletionScreenProps {
  totalCards: number;
  onRetry: () => void;
}

function CompletionScreen({ totalCards, onRetry }: CompletionScreenProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-6 py-10">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.h1
          className="text-display text-type-primary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          {totalCards}개 분류 카드, 모두 풀었어요.
        </motion.h1>
        <p className="text-body text-type-secondary">내일 또 봐요.</p>
      </section>
      <footer className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-body text-type-primary transition-colors hover:bg-accent-positive/10"
        >
          한 번 더 풀어볼까요
        </button>
        <Link
          href="/"
          className="block w-full rounded-button border border-border-hairline bg-bg-block px-4 py-3 text-center text-body text-type-primary"
        >
          다른 게임
        </Link>
        <Link
          href="/"
          className="block w-full px-4 py-3 text-center text-body text-type-secondary hover:text-type-primary"
        >
          오늘은 끝
        </Link>
      </footer>
    </main>
  );
}
