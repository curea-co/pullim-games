"use client";

// 타이핑 메커닉 — vocab-typing / custom-typing 공유.
// 뜻풀이 → 텍스트 입력 (strict 일치). letter-fade-in + 힌트 버튼.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import {
  applyAndPersist,
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  selectCardsForMode,
  useGameMode,
} from "@/lib/core";
import { TimeAttackTimer } from "./TimeAttackTimer";
import { DeepRecallEmpty } from "./DeepRecallEmpty";

type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

const REVEAL_THRESHOLD = 5;

export interface TypingCardLike {
  id: string;
  unit: string;
  hint?: string;
  problem: {
    meaning: string;
    answer: string;
    pronunciation?: string;
  };
}

interface Props {
  gameId: string;
  cards: TypingCardLike[];
  completionMessage: (count: number) => string;
  completionSubtext?: string;
  emptyMessage?: { title: string; cta?: { label: string; href: string } };
  homeHref?: string;
}

export function TypingComponent({
  gameId,
  cards: initialCards,
  completionMessage,
  completionSubtext,
  emptyMessage,
  homeHref = "/",
}: Props) {
  const mode = useGameMode();
  const pathname = usePathname();
  const [cards, setCards] = useState(() =>
    mode === "deep-recall" ? [] : initialCards,
  );
  const [cardsLoaded, setCardsLoaded] = useState(mode === "default");
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [input, setInput] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardStartRef = useRef<number>(0);

  useEffect(() => {
    const all = loadAllSrsStates(gameId);
    const withSrs = initialCards.map((c) => ({
      card: c,
      srs: all.get(c.id) ?? loadSrsState(gameId, c.id),
    }));
    const ordered = selectCardsForMode(
      withSrs,
      mode,
      initialCards.length,
    ).map((x) => x.card);
    setCards(
      mode === "deep-recall" ? ordered : ordered.length > 0 ? ordered : initialCards,
    );
    setCardsLoaded(true);
    void logEvent({ gameId, cardId: null, action: "session-start" });
    return () => {
      void logEvent({ gameId, cardId: null, action: "session-end" });
    };
  }, [gameId, mode, initialCards]);

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  useEffect(() => {
    if (!card) return;
    setInput("");
    setWrongCount(0);
    setHintUsed(false);
    setPhase("playing");
    inputRef.current?.focus();
    // time-attack 카드별 기준 시각 갱신
    cardStartRef.current = performance.now();
  }, [cardIndex, card]);

  if (cards.length === 0) {
    if (cardsLoaded && mode === "deep-recall" && initialCards.length > 0) {
      return (
        <DeepRecallEmpty homeHref={homeHref} defaultModeHref={pathname ?? "/"} />
      );
    }
    // PR #92 Codex round 3 fix: deep-recall 미로딩(`cardsLoaded=false`) 상태에서
    // 일반 empty-state 가 한 프레임 노출되는 회귀 차단.
    if (mode === "deep-recall" && !cardsLoaded) {
      return null;
    }
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

  function handleSubmit() {
    if (phase !== "playing") return;
    const trimmed = input.trim();
    if (trimmed.length === 0) return;
    setPhase("checking");
    // case-insensitive 정답 매칭 — english-vocab-typing 의 "Achieve" 입력도 정답 인식.
    // 한글·한자는 toLocaleLowerCase 영향 없음 (이미 case 개념 X).
    // memory 룰 feedback_user_intent_literal: "사용자가 X했는데 틀렸대. 맞잖아" = 시스템 fix.
    const correct =
      trimmed.toLocaleLowerCase() === card!.problem.answer.toLocaleLowerCase();
    // Plan E Phase 3 — time-attack 시 elapsedMs 측정 (카드 진입 ~ submit 까지).
    const elapsedMs = performance.now() - cardStartRef.current;

    void logEvent({
      gameId,
      cardId: card!.id,
      action: "submit",
      payload: { correct, input: trimmed, hintUsed, wrongCount, elapsedMs },
    });

    setTimeout(() => {
      if (correct) {
        // Plan A Phase 3 — modes wrapper 마이그레이션. rating 결정은 resolveRating(default).
        applyAndPersist(mode, gameId, card!.id, {
          correct: true,
          wrongCount,
          hintUsed,
          elapsedMs,
        });
        setPhase("correct");
      } else {
        const nextWrong = wrongCount + 1;
        setWrongCount(nextWrong);
        if (nextWrong >= REVEAL_THRESHOLD) {
          applyAndPersist(mode, gameId, card!.id, {
            correct: false,
            wrongCount: nextWrong,
            hintUsed,
            elapsedMs,
          });
          void logEvent({
            gameId,
            cardId: card!.id,
            action: "transform",
            payload: { reveal: true, wrongCount: nextWrong },
          });
          setInput(card!.problem.answer);
          setPhase("reveal");
          return;
        }
        setPhase("wrong");
        setTimeout(() => {
          setInput("");
          setPhase("playing");
          inputRef.current?.focus();
        }, 1200);
      }
    }, 200);
  }

  // time-attack 시간 초과 — 강제 reveal (정답 노출 + again 적용).
  function handleTimeout() {
    if (phase !== "playing") return;
    void logEvent({
      gameId,
      cardId: card!.id,
      action: "submit",
      payload: { timeout: true, correct: false, elapsedMs: 30_001 },
    });
    applyAndPersist(mode, gameId, card!.id, {
      correct: false,
      wrongCount: wrongCount + 1,
      hintUsed,
      elapsedMs: 30_001,
    });
    setInput(card!.problem.answer);
    setPhase("reveal");
  }

  function showHint() {
    if (phase !== "playing") return;
    if (hintUsed) return;
    setHintUsed(true);
    void logEvent({
      gameId,
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
  const isResolved = phase === "correct" || phase === "reveal";

  return (
    <>
      <CorrectBurst show={phase === "correct"} />
      <GameShell
      variant="split"
      header={
        <div className="flex flex-col gap-1">
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
          <TimeAttackTimer
            active={mode === "time-attack" && phase === "playing"}
            resetKey={cardIndex}
            onExpire={handleTimeout}
          />
        </div>
      }
      content={
        <>
          <p className="mt-6 text-helper text-type-secondary lg:mt-0">{card.unit}</p>
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

          <motion.div
            className="mt-8 flex flex-1 flex-col items-center justify-center gap-4"
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
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
                  isResolved ? "text-accent-positive" : "text-type-primary"
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

        {phase === "reveal" && (
          <RevealBanner attemptCount={wrongCount} />
        )}

        {isResolved && card.problem.pronunciation && (
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
          placeholder="입력해주세요"
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
      </motion.div>
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
            onClick={handleSubmit}
            disabled={phase !== "playing" || input.trim().length === 0}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            확인
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" && "입력해주세요"}
          {phase === "wrong" && "정답이 아니에요. 다시 해보세요."}
          {phase === "correct" && "정답이에요"}
          {phase === "reveal" &&
            `여러 번 시도했어요. 정답은 ${card.problem.answer}.`}
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
