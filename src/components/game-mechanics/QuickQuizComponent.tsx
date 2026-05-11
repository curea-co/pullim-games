"use client";

// 객관식 4지선다 메커닉 — math-quick-quiz / english-blank / custom-multiple-choice 가
// 공유하는 일반화 컴포넌트. `2026-05-08_management.md` §8.2 따름.
//
// 본 게임이 만들어 놓은 카드 (또는 사용자 커스텀 카드) 를 그대로 받아 5-phase 풀이.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

type Phase = "idle" | "selecting" | "feedback" | "completed";

export interface QuickQuizCardLike {
  id: string;
  unit: string;
  hint?: string;
  problem: {
    question: string;
    choices: string[];
    correctIndex: number;
  };
}

interface Props {
  gameId: string;
  cards: QuickQuizCardLike[];
  /** 완료 화면 카피. 게임마다 다름 ("5문제, 빠르게 끝났어요" 등). */
  completionMessage: (count: number) => string;
  /** 완료 sub-카피 (기본 "내일 또 봐요"). */
  completionSubtext?: string;
  /** 빈 카드 풀 (custom 게임 빈 상태) 화면. 기본 메시지 제공. */
  emptyMessage?: { title: string; cta?: { label: string; href: string } };
  /** 0개 카드일 때도 항상 home 으로 가는 fallback URL. */
  homeHref?: string;
}

export function QuickQuizComponent({
  gameId,
  cards: initialCards,
  completionMessage,
  completionSubtext,
  emptyMessage,
  homeHref = "/",
}: Props) {
  const [cards, setCards] = useState(() => initialCards);
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<number | null>(null);
  const dragStartedRef = useRef(false);

  useEffect(() => {
    const all = loadAllSrsStates(gameId);
    if (all.size > 0) {
      const withSrs = initialCards.map((c) => ({
        card: c,
        srs: all.get(c.id) ?? loadSrsState(gameId, c.id),
      }));
      const ordered = selectNextCards(withSrs, initialCards.length).map(
        (x) => x.card,
      );
      setCards(ordered);
    }
    void logEvent({ gameId, cardId: null, action: "session-start" });
    return () => {
      void logEvent({ gameId, cardId: null, action: "session-end" });
    };
  }, [gameId]);

  // 빈 카드 풀
  if (cards.length === 0) {
    return (
      <main className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-display text-type-primary">
          {emptyMessage?.title ?? "아직 풀 카드가 없어요."}
        </h1>
        {emptyMessage?.cta && (
          <Link
            href={emptyMessage.cta.href}
            className="rounded-button border border-type-primary bg-bg-block px-4 py-3 text-body text-type-primary hover:bg-accent-positive/10"
          >
            {emptyMessage.cta.label}
          </Link>
        )}
        <Link
          href={homeHref}
          className="text-helper text-type-secondary hover:text-type-primary"
        >
          홈으로
        </Link>
      </main>
    );
  }

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  if (phase === "completed") {
    return (
      <CompletionScreen
        message={completionMessage(cards.length)}
        subtext={completionSubtext ?? "내일 또 봐요."}
        homeHref={homeHref}
        onRetry={() => {
          setCardIndex(0);
          setPhase("idle");
          setPicked(null);
          void logEvent({
            gameId,
            cardId: null,
            action: "session-start",
            payload: { retry: true },
          });
        }}
      />
    );
  }

  if (!card) return null;

  const handlePick = (choiceIdx: number) => {
    if (phase !== "idle") return;
    setPicked(choiceIdx);
    setPhase("feedback");

    const correct = choiceIdx === card.problem.correctIndex;
    void logEvent({
      gameId,
      cardId: card.id,
      action: "submit",
      payload: { picked: choiceIdx, correct },
    });

    const prev = loadSrsState(gameId, card.id);
    const next = reviewCard(prev, correct ? "good" : "again");
    saveSrsState(gameId, card.id, next);
  };

  const handleNext = () => {
    if (isLastCard) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
    setPhase("idle");
    setPicked(null);
    dragStartedRef.current = false;
  };

  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-6 py-6">
      <header className="flex items-center justify-between text-label tabular text-type-secondary">
        <span>
          {cardIndex + 1} / {cards.length}
        </span>
        <Link
          href={homeHref}
          aria-label="메인으로"
          className="rounded-button px-2 py-1 hover:text-type-primary"
        >
          ≡
        </Link>
      </header>

      <p className="mt-6 text-helper text-type-secondary">{card.unit}</p>
      <h1 className="mt-2 text-display text-type-primary">
        {card.problem.question}
      </h1>
      {card.hint && (
        <p className="mt-2 text-helper text-type-secondary">힌트 · {card.hint}</p>
      )}

      <section className="mt-8 flex flex-1 flex-col gap-3">
        {card.problem.choices.map((choice, idx) => (
          <ChoiceButton
            key={`${cardIndex}-${idx}`}
            label={choice}
            picked={picked === idx}
            correct={idx === card.problem.correctIndex}
            phase={phase}
            onClick={() => handlePick(idx)}
          />
        ))}
      </section>

      <footer className="mt-6">
        {phase === "feedback" ? (
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
            disabled
            className="w-full rounded-button border border-border-hairline px-4 py-3 text-body text-type-secondary opacity-50"
          >
            다음 →
          </button>
        )}
      </footer>

      <span className="sr-only" aria-live="polite">
        {phase === "idle" && "선택지를 골라주세요"}
        {phase === "feedback" &&
          (picked === card.problem.correctIndex
            ? "정답이에요"
            : "정답은 다른 보기였어요")}
      </span>
    </main>
  );
}

interface ChoiceButtonProps {
  label: string;
  picked: boolean;
  correct: boolean;
  phase: Phase;
  onClick: () => void;
}

function ChoiceButton({
  label,
  picked,
  correct,
  phase,
  onClick,
}: ChoiceButtonProps) {
  let stateClass = "border-border-hairline bg-bg-block";
  if (phase === "feedback") {
    if (picked && correct) {
      stateClass = "border-accent-positive bg-accent-positive/10";
    } else if (picked && !correct) {
      stateClass = "border-accent-negative bg-accent-negative/10";
    } else if (correct) {
      stateClass = "border-accent-positive bg-accent-positive/5";
    } else {
      stateClass = "border-border-hairline bg-bg-block opacity-60";
    }
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={phase !== "idle"}
      whileHover={phase === "idle" ? { scale: 1.01 } : undefined}
      whileTap={phase === "idle" ? { scale: 0.99 } : undefined}
      animate={
        phase === "feedback" && picked && !correct
          ? { x: [0, -4, 4, -4, 4, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.32 }}
      className={`block w-full rounded-block border px-5 py-4 text-left text-body text-type-primary transition-colors ${stateClass}`}
    >
      {label}
    </motion.button>
  );
}

interface CompletionScreenProps {
  message: string;
  subtext: string;
  homeHref: string;
  onRetry: () => void;
}

function CompletionScreen({
  message,
  subtext,
  homeHref,
  onRetry,
}: CompletionScreenProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-6 py-10">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.h1
          className="text-display text-type-primary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          {message}
        </motion.h1>
        <p className="text-body text-type-secondary">{subtext}</p>
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
          href={homeHref}
          className="block w-full rounded-button border border-border-hairline bg-bg-block px-4 py-3 text-center text-body text-type-primary"
        >
          다른 게임
        </Link>
        <Link
          href={homeHref}
          className="block w-full px-4 py-3 text-center text-body text-type-secondary hover:text-type-primary"
        >
          오늘은 끝
        </Link>
      </footer>
    </main>
  );
}
