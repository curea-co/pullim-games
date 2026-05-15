"use client";

// 매칭 메커닉 — english-word-match / custom-word-match 공유.
// 좌·우 컬럼 셔플, 2-탭 매칭 + AnimatePresence fade-out.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

type Phase =
  | "playing"
  | "wrong-flash"
  | "correct-flash"
  | "reveal"
  | "completed";

const REVEAL_THRESHOLD = 5;

interface SideItem {
  pairIndex: number;
  text: string;
}

export interface WordMatchCardLike {
  id: string;
  unit: string;
  hint?: string;
  problem: {
    pairs: { left: string; right: string }[];
  };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  function next(): number {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0x100000000;
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

interface Props {
  gameId: string;
  cards: WordMatchCardLike[];
  /** 좌측 컬럼 라벨 (시각용 X, 카드 prop 의 left 사용) — 명시 X */
  completionMessage: (count: number) => string;
  completionSubtext?: string;
  emptyMessage?: { title: string; cta?: { label: string; href: string } };
  homeHref?: string;
}

export function WordMatchComponent({
  gameId,
  cards: initialCards,
  completionMessage,
  completionSubtext,
  emptyMessage,
  homeHref = "/",
}: Props) {
  const [cards, setCards] = useState(() => initialCards);
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState<{
    left: number;
    right: number;
  } | null>(null);
  const [wrongCount, setWrongCount] = useState(0);

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

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  const leftItems: SideItem[] = useMemo(() => {
    if (!card) return [];
    return seededShuffle(
      card.problem.pairs.map((p, i) => ({ pairIndex: i, text: p.left })),
      `${card.id}-l`,
    );
  }, [card]);

  const rightItems: SideItem[] = useMemo(() => {
    if (!card) return [];
    return seededShuffle(
      card.problem.pairs.map((p, i) => ({ pairIndex: i, text: p.right })),
      `${card.id}-r`,
    );
  }, [card]);

  useEffect(() => {
    setMatched(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongFlash(null);
    setWrongCount(0);
    setPhase("playing");
  }, [cardIndex]);

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

  if (phase === "completed") {
    return (
      <CompletionScreen
        message={completionMessage(cards.length)}
        subtext={completionSubtext ?? "내일 또 봐요."}
        homeHref={homeHref}
        onRetry={() => {
          setCardIndex(0);
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

  function tryMatch(leftPair: number, rightPair: number) {
    if (leftPair === rightPair) {
      const next = new Set(matched);
      next.add(leftPair);
      setMatched(next);
      setSelectedLeft(null);
      setSelectedRight(null);
      void logEvent({
        gameId,
        cardId: card!.id,
        action: "transform",
        payload: { pairIndex: leftPair, correct: true },
      });
      setPhase("correct-flash");
      setTimeout(() => setPhase("playing"), 500);
      if (next.size === card!.problem.pairs.length) {
        const rating =
          wrongCount === 0 ? "good" : wrongCount <= 2 ? "hard" : "again";
        const prev = loadSrsState(gameId, card!.id);
        const updated = reviewCard(prev, rating);
        saveSrsState(gameId, card!.id, updated);
        void logEvent({
          gameId,
          cardId: card!.id,
          action: "submit",
          payload: { wrongCount, rating },
        });
      }
    } else {
      const nextWrong = wrongCount + 1;
      setWrongFlash({ left: leftPair, right: rightPair });
      setWrongCount(nextWrong);
      void logEvent({
        gameId,
        cardId: card!.id,
        action: "transform",
        payload: { leftPair, rightPair, correct: false },
      });
      if (nextWrong >= REVEAL_THRESHOLD) {
        const prev = loadSrsState(gameId, card!.id);
        const updated = reviewCard(prev, "again");
        saveSrsState(gameId, card!.id, updated);
        void logEvent({
          gameId,
          cardId: card!.id,
          action: "transform",
          payload: { reveal: true, wrongCount: nextWrong },
        });
        setTimeout(() => {
          setSelectedLeft(null);
          setSelectedRight(null);
          setWrongFlash(null);
          setPhase("reveal");
        }, 600);
        return;
      }
      setPhase("wrong-flash");
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setWrongFlash(null);
        setPhase("playing");
      }, 600);
    }
  }

  function handleLeftTap(pairIndex: number) {
    if (phase !== "playing") return;
    if (matched.has(pairIndex)) return;
    if (selectedRight !== null) {
      tryMatch(pairIndex, selectedRight);
      return;
    }
    setSelectedLeft(pairIndex === selectedLeft ? null : pairIndex);
  }

  function handleRightTap(pairIndex: number) {
    if (phase !== "playing") return;
    if (matched.has(pairIndex)) return;
    if (selectedLeft !== null) {
      tryMatch(selectedLeft, pairIndex);
      return;
    }
    setSelectedRight(pairIndex === selectedRight ? null : pairIndex);
  }

  function handleNext() {
    if (isLastCard) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
  }

  const allMatched = matched.size === card.problem.pairs.length;
  const isResolved = allMatched || phase === "reveal";

  return (
    <>
      <CorrectBurst show={phase === "correct-flash"} />
      <GameShell
      variant="match"
      header={
        <div className="flex items-center justify-between text-label tabular text-type-secondary">
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
        </div>
      }
      content={
        <>
          <p className="mt-6 text-helper text-type-secondary">{card.unit}</p>
          <h1 className="mt-2 text-display text-type-primary">짝을 맞춰주세요</h1>
          {card.hint && (
            <p className="mt-1 text-helper text-type-secondary">힌트 · {card.hint}</p>
          )}
          <p className="mt-2 text-helper tabular text-type-secondary">
            매칭 {matched.size} / {card.problem.pairs.length}
            {wrongCount > 0 && ` · 오답 ${wrongCount}`}
          </p>

          {phase === "reveal" && (
            <div className="mt-4 flex flex-col gap-3">
              <RevealBanner attemptCount={wrongCount} />
              <ul className="flex flex-col gap-2">
                {card.problem.pairs.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-block border border-accent-positive/30 bg-accent-positive/5 px-3 py-3 text-body text-type-primary"
                  >
                    <span>{p.left}</span>
                    <span className="text-type-secondary">→</span>
                    <span>{p.right}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase !== "reveal" && (
          <div className="mt-6 grid flex-1 grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {leftItems
              .filter((it) => !matched.has(it.pairIndex))
              .map((it) => (
                <motion.button
                  key={it.pairIndex}
                  type="button"
                  onClick={() => handleLeftTap(it.pairIndex)}
                  disabled={phase !== "playing"}
                  layout
                  exit={{ opacity: 0, scale: 0.85 }}
                  animate={
                    wrongFlash?.left === it.pairIndex
                      ? { x: [0, -4, 4, -4, 4, 0] }
                      : { x: 0 }
                  }
                  transition={{ duration: 0.32 }}
                  className={`rounded-block border px-3 py-3 text-left text-body transition-colors ${
                    selectedLeft === it.pairIndex
                      ? "border-type-primary bg-accent-positive/10 text-type-primary"
                      : wrongFlash?.left === it.pairIndex
                        ? "border-accent-negative bg-accent-negative/10 text-type-primary"
                        : "border-border-hairline bg-bg-block text-type-primary"
                  }`}
                >
                  {it.text}
                </motion.button>
              ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {rightItems
              .filter((it) => !matched.has(it.pairIndex))
              .map((it) => (
                <motion.button
                  key={it.pairIndex}
                  type="button"
                  onClick={() => handleRightTap(it.pairIndex)}
                  disabled={phase !== "playing"}
                  layout
                  exit={{ opacity: 0, scale: 0.85 }}
                  animate={
                    wrongFlash?.right === it.pairIndex
                      ? { x: [0, -4, 4, -4, 4, 0] }
                      : { x: 0 }
                  }
                  transition={{ duration: 0.32 }}
                  className={`rounded-block border px-3 py-3 text-left text-body transition-colors ${
                    selectedRight === it.pairIndex
                      ? "border-type-primary bg-accent-positive/10 text-type-primary"
                      : wrongFlash?.right === it.pairIndex
                        ? "border-accent-negative bg-accent-negative/10 text-type-primary"
                        : "border-border-hairline bg-bg-block text-type-primary"
                  }`}
                >
                  {it.text}
                </motion.button>
              ))}
          </AnimatePresence>
        </div>
          </div>
          )}
        </>
      }
      cta={
        isResolved ? (
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
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "reveal"
            ? "여러 번 시도했어요. 정답을 보여줄게요."
            : allMatched
              ? "모든 짝이 맞았어요"
              : "짝을 골라 매칭해주세요"}
        </span>
      }
    />
    </>
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
