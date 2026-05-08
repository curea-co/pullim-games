"use client";

// 어휘 타이핑 — 뜻풀이 → 한글 음 입력 (V2 1차).
// V3+ 한자 직접 입력 검토. 입력한 글자가 letter-fade-in.
// 힌트 사용 시 FSRS rating 패널티 (good → hard).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getCardSequence } from "./content";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "vocab-typing";
type Phase = "playing" | "checking" | "correct" | "wrong" | "completed";

export default function VocabTypingGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [input, setInput] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    setInput("");
    setWrongCount(0);
    setHintUsed(false);
    setPhase("playing");
    // 모바일 키보드 호출 — 사용자 첫 탭 후 인지
    inputRef.current?.focus();
  }, [cardIndex, card]);

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

  function handleSubmit() {
    if (phase !== "playing") return;
    const trimmed = input.trim();
    if (trimmed.length === 0) return;
    setPhase("checking");
    const correct = trimmed === card!.problem.answer;

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { correct, input: trimmed, hintUsed, wrongCount },
    });

    setTimeout(() => {
      if (correct) {
        const rating = hintUsed
          ? "hard"
          : wrongCount === 0
            ? "good"
            : wrongCount === 1
              ? "hard"
              : "again";
        const prev = loadSrsState(GAME_ID, card!.id);
        const updated = reviewCard(prev, rating);
        saveSrsState(GAME_ID, card!.id, updated);
        setPhase("correct");
      } else {
        setWrongCount((w) => w + 1);
        setPhase("wrong");
        setTimeout(() => {
          setInput("");
          setPhase("playing");
          inputRef.current?.focus();
        }, 1200);
      }
    }, 200);
  }

  function showHint() {
    if (phase !== "playing") return;
    if (hintUsed) return;
    setHintUsed(true);
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { hint: "first-letter" },
    });
  }

  function handleNext() {
    if (isLastCard) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
  }

  const firstLetter = card.problem.answer.charAt(0);

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
      <h1 className="mt-2 text-display text-type-primary leading-snug">
        {card.problem.meaning}
      </h1>
      {card.hint && !hintUsed && (
        <p className="mt-2 text-helper text-type-secondary">힌트 · {card.hint}</p>
      )}
      {hintUsed && (
        <p className="mt-2 text-helper text-type-secondary">
          첫 글자 · <span className="text-type-primary">{firstLetter}</span>...
        </p>
      )}

      {/* 입력 + 글자 표시 */}
      <motion.section
        className="mt-8 flex flex-1 flex-col items-center justify-center gap-4"
        animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.36 }}
      >
        {/* letter-fade-in 표시 */}
        <div className="flex min-h-[3rem] items-center gap-1.5">
          <AnimatePresence mode="popLayout">
            {[...input].map((ch, i) => (
              <motion.span
                key={`${cardIndex}-${i}-${ch}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={`text-display tabular ${
                  phase === "correct"
                    ? "text-accent-positive"
                    : "text-type-primary"
                }`}
              >
                {ch}
              </motion.span>
            ))}
          </AnimatePresence>
          {input.length === 0 && (
            <span className="text-display text-type-secondary/40">_</span>
          )}
        </div>

        {/* 정답 시 한자 표기 */}
        {phase === "correct" && card.problem.pronunciation && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.24 }}
            className="text-body tabular text-type-secondary"
          >
            {card.problem.pronunciation}
          </motion.p>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={phase !== "playing"}
          placeholder="한글로 입력해주세요"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-block border border-border-hairline bg-bg-block px-4 py-3 text-center text-body tabular text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none disabled:opacity-60"
        />

        <div className="flex gap-2 text-helper text-type-secondary">
          {!hintUsed && phase === "playing" && (
            <button
              type="button"
              onClick={showHint}
              className="rounded-button border border-border-hairline px-3 py-1 hover:text-type-primary"
            >
              힌트
            </button>
          )}
          {wrongCount > 0 && phase !== "correct" && (
            <span className="tabular">오답 {wrongCount}회</span>
          )}
        </div>
      </motion.section>

      <footer className="mt-6">
        {phase === "correct" ? (
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
            onClick={handleSubmit}
            disabled={phase !== "playing" || input.trim().length === 0}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            확인
          </button>
        )}
      </footer>

      <span className="sr-only" aria-live="polite">
        {phase === "playing" && "한글로 입력해주세요"}
        {phase === "wrong" && "정답이 아니에요. 다시 해보세요."}
        {phase === "correct" && "정답이에요"}
      </span>
    </main>
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
          {totalCards}개 어휘, 손가락에 박혔어요.
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
