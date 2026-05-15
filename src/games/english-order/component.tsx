"use client";

// 영어 어순 맞추기 — 단어 풀에서 골라 슬롯 채우기.
// 모든 슬롯 채워지면 자동 검증 → 정답이면 jade glow, 오답이면 shake + 자동 reset.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { getCardSequence } from "./content";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "english-order";
const REVEAL_THRESHOLD = 5;
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

interface PoolWord {
  id: string;
  text: string;
}

/** Deterministic shuffle (Fisher-Yates with seed = string hash). */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // LCG-like next
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

export default function EnglishOrderGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [wrongCount, setWrongCount] = useState(0);
  const dragStartedRef = useRef(false);

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
    void logEvent({
      gameId: GAME_ID,
      cardId: null,
      action: "session-start",
    });
    return () => {
      void logEvent({
        gameId: GAME_ID,
        cardId: null,
        action: "session-end",
      });
    };
  }, []);

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  // pool: deterministic 셔플된 단어
  const poolWords: PoolWord[] = useMemo(() => {
    if (!card) return [];
    const items = card.problem.english.map((w, i) => ({
      id: `${card.id}-w${i}`,
      text: w,
    }));
    return seededShuffle(items, card.id);
  }, [card]);

  // slots[i] = poolWord.id | null
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    card ? Array(card.problem.english.length).fill(null) : [],
  );

  // 카드 바뀌면 slots 초기화
  useEffect(() => {
    if (!card) return;
    setSlots(Array(card.problem.english.length).fill(null));
    setWrongCount(0);
    setPhase("playing");
    dragStartedRef.current = false;
  }, [cardIndex, card]);

  if (phase === "completed") {
    return (
      <CompletionScreen
        totalCards={cards.length}
        onRetry={() => {
          setCardIndex(0);
          setPhase("playing");
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

  const placedIds = new Set(slots.filter((s): s is string => s !== null));
  const availablePool = poolWords.filter((pw) => !placedIds.has(pw.id));

  function placeWord(wordId: string) {
    if (phase !== "playing") return;
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty === -1) return;
    if (!dragStartedRef.current) {
      dragStartedRef.current = true;
      void logEvent({
        gameId: GAME_ID,
        cardId: card!.id,
        action: "drag-start",
      });
    }
    const next = [...slots];
    next[firstEmpty] = wordId;
    setSlots(next);
    if (next.every((s) => s !== null)) {
      checkAnswer(next);
    }
  }

  function removeFromSlot(slotIdx: number) {
    if (phase !== "playing") return;
    if (slots[slotIdx] === null) return;
    const next = [...slots];
    next[slotIdx] = null;
    setSlots(next);
  }

  function checkAnswer(filledSlots: (string | null)[]) {
    setPhase("checking");
    const assembled = filledSlots
      .map((id) => poolWords.find((pw) => pw.id === id)?.text ?? "")
      .join(" ");
    const expected = card!.problem.english.join(" ");
    const correct = assembled === expected;

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { correct, assembled },
    });

    const prev = loadSrsState(GAME_ID, card!.id);
    const next = reviewCard(prev, correct ? "good" : "again");
    saveSrsState(GAME_ID, card!.id, next);

    setTimeout(() => {
      if (correct) {
        setPhase("correct");
        return;
      }
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      if (nextWrong >= REVEAL_THRESHOLD) {
        void logEvent({
          gameId: GAME_ID,
          cardId: card!.id,
          action: "transform",
          payload: { reveal: true, wrongCount: nextWrong },
        });
        const correctOrder: (string | null)[] = card!.problem.english.map(
          (text) => {
            const pw = poolWords.find((p) => p.text === text);
            return pw ? pw.id : null;
          },
        );
        setSlots(correctOrder);
        setPhase("reveal");
        return;
      }
      setPhase("wrong");
      setTimeout(() => {
        setSlots(Array(card!.problem.english.length).fill(null));
        setPhase("playing");
      }, 1200);
    }, 200);
  }

  function handleNext() {
    if (isLastCard) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
  }

  const isResolved = phase === "correct" || phase === "reveal";

  return (
    <>
      <CorrectBurst show={phase === "correct"} />
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
          <p className="mt-6 text-helper text-type-secondary lg:mt-0">{card.unit}</p>
          <h1 className="mt-2 text-display text-type-primary">{card.problem.korean}</h1>
          {card.hint && (
            <p className="mt-2 text-helper text-type-secondary">힌트 · {card.hint}</p>
          )}
          {phase === "reveal" && (
            <div className="mt-3">
              <RevealBanner attemptCount={wrongCount} />
            </div>
          )}

          {/* Slots — 영어 어순 자리 */}
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-2"
            animate={
              phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }
            }
            transition={{ duration: 0.36 }}
          >
        {slots.map((wordId, slotIdx) => {
          const word = wordId
            ? poolWords.find((pw) => pw.id === wordId)?.text
            : null;
          return (
            <button
              key={`slot-${slotIdx}`}
              type="button"
              onClick={() => removeFromSlot(slotIdx)}
              disabled={phase !== "playing" || word === null}
              className={`min-w-[3rem] rounded-block border px-3 py-2 text-body text-type-primary transition-colors ${
                isResolved && word
                  ? "border-accent-positive bg-accent-positive/10"
                  : word
                    ? "border-type-primary bg-bg-block"
                    : "border-dashed border-border-hairline bg-bg-primary text-type-secondary"
              }`}
            >
              {word ?? "·"}
            </button>
          );
        })}
      </motion.div>

      {/* Pool — 셔플된 단어 풀 */}
      <div className="mt-6 flex flex-1 flex-wrap items-start content-start gap-2">
        {availablePool.map((pw) => (
          <motion.button
            key={pw.id}
            type="button"
            onClick={() => placeWord(pw.id)}
            disabled={phase !== "playing"}
            whileHover={phase === "playing" ? { scale: 1.03 } : undefined}
            whileTap={phase === "playing" ? { scale: 0.97 } : undefined}
            layout
            className="rounded-block border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary"
          >
            {pw.text}
          </motion.button>
        ))}
      </div>
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
          {phase === "playing" && "단어를 골라 어순을 맞춰주세요"}
          {phase === "wrong" && "어순이 틀렸어요. 다시 해보세요."}
          {phase === "correct" && "정답이에요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 어순을 보여줄게요."}
        </span>
      }
    />
    </>
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
          {totalCards}문장, 어순이 손에 잡혔어요.
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
