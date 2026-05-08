"use client";

// 영어 빈칸 추론 — 본문 + 4지선다.
// 정답 시 본문 빈칸에 정답 단어 jade 삽입. 오답 시 rationale 표시.

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getCardSequence } from "./content";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "english-blank";
type Phase = "playing" | "feedback" | "completed";

export default function EnglishBlankGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [picked, setPicked] = useState<number | null>(null);

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

  if (phase === "completed") {
    return (
      <CompletionScreen
        totalCards={cards.length}
        onRetry={() => {
          setCardIndex(0);
          setPhase("playing");
          setPicked(null);
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

  function handlePick(idx: number) {
    if (phase !== "playing") return;
    setPicked(idx);
    setPhase("feedback");
    const correct = idx === card!.problem.correctIndex;

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { picked: idx, correct },
    });

    const prev = loadSrsState(GAME_ID, card!.id);
    const updated = reviewCard(prev, correct ? "good" : "again");
    saveSrsState(GAME_ID, card!.id, updated);
  }

  function handleNext() {
    if (isLastCard) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
    setPhase("playing");
    setPicked(null);
  }

  // 본문 ___ 처리: feedback 시 정답이면 jade 삽입
  const correctWord = card.problem.choices[card.problem.correctIndex] ?? "";
  const passageNodes = card.problem.passage.split("___").flatMap((seg, i, arr) => {
    const nodes: React.ReactNode[] = [<span key={`s-${i}`}>{seg}</span>];
    if (i < arr.length - 1) {
      nodes.push(
        <span
          key={`b-${i}`}
          className={
            phase === "feedback" && picked === card.problem.correctIndex
              ? "rounded-button bg-accent-positive/20 px-1.5 font-bold text-accent-positive"
              : "border-b-2 border-type-secondary px-1 text-type-secondary"
          }
        >
          {phase === "feedback" && picked === card.problem.correctIndex
            ? correctWord
            : "______"}
        </span>,
      );
    }
    return nodes;
  });

  const isCorrect = picked === card.problem.correctIndex;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 py-8">
      <header className="flex items-center justify-between text-label tabular text-type-secondary">
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
      </header>

      <p className="mt-6 text-helper text-type-secondary">{card.unit}</p>
      <h1 className="mt-2 text-label text-type-secondary">빈칸에 알맞은 말은?</h1>

      <motion.section
        className="mt-3 rounded-block border border-border-hairline bg-bg-block p-4 text-body leading-relaxed text-type-primary"
        animate={
          phase === "feedback" && !isCorrect ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }
        }
        transition={{ duration: 0.32 }}
      >
        {passageNodes}
      </motion.section>

      {card.hint && phase === "playing" && (
        <p className="mt-2 text-helper text-type-secondary">힌트 · {card.hint}</p>
      )}

      <section className="mt-4 flex flex-col gap-2">
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

      {phase === "feedback" && card.problem.rationale && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-3 rounded-block border border-border-hairline bg-bg-primary p-3 text-helper leading-relaxed text-type-secondary"
        >
          해설 · {card.problem.rationale}
        </motion.p>
      )}

      <footer className="mt-auto pt-4">
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
            보기를 골라주세요
          </button>
        )}
      </footer>

      <span className="sr-only" aria-live="polite">
        {phase === "playing" && "보기를 골라주세요"}
        {phase === "feedback" && (isCorrect ? "정답이에요" : "정답은 다른 보기였어요")}
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

function ChoiceButton({ label, picked, correct, phase, onClick }: ChoiceButtonProps) {
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
      disabled={phase !== "playing"}
      whileHover={phase === "playing" ? { scale: 1.01 } : undefined}
      whileTap={phase === "playing" ? { scale: 0.99 } : undefined}
      className={`block w-full rounded-block border px-4 py-3 text-left text-body text-type-primary transition-colors ${stateClass}`}
    >
      {label}
    </motion.button>
  );
}

interface CompletionScreenProps {
  totalCards: number;
  onRetry: () => void;
}

function CompletionScreen({ totalCards, onRetry }: CompletionScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 py-10">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.h1
          className="text-display text-type-primary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          {totalCards}개 빈칸, 글의 흐름이 보였어요.
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
