"use client";

// 빈칸 추론 메커닉 — english-blank / custom-blank 공유.
// 본문 ___ + 4지선다. 정답 시 빈칸에 정답 단어 jade 삽입, 오답 시 rationale 표시.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  applyAndPersist,
  selectCardsForMode,
  useGameMode,
} from "@/lib/core";
import { TimeAttackTimer } from "./TimeAttackTimer";
import { DeepRecallEmpty } from "./DeepRecallEmpty";
import { useEnterToAdvance } from "./useEnterToAdvance";

type Phase = "playing" | "feedback" | "completed";

export interface BlankCardLike {
  id: string;
  unit: string;
  hint?: string;
  problem: {
    passage: string; // ___ 토큰 포함
    choices: string[];
    correctIndex: number;
    rationale?: string;
  };
}

interface Props {
  gameId: string;
  cards: BlankCardLike[];
  completionMessage: (count: number) => string;
  completionSubtext?: string;
  emptyMessage?: { title: string; cta?: { label: string; href: string } };
  homeHref?: string;
}

export function BlankComponent({
  gameId,
  cards: initialCards,
  completionMessage,
  completionSubtext,
  emptyMessage,
  homeHref = "/",
}: Props) {
  // PR #92 Codex round 4 fix: gameId 를 전달해 비지원 mode URL 직접 진입 시 default 로
  // 정규화 — `?mode=time-attack` 으로 4 메커니즘 미통합 게임 진입을 라우트 단에서 차단.
  const mode = useGameMode(gameId);
  const pathname = usePathname();
  const [cards, setCards] = useState(() =>
    mode === "deep-recall" ? [] : initialCards,
  );
  const [cardsLoaded, setCardsLoaded] = useState(mode === "default");
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [picked, setPicked] = useState<number | null>(null);
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

  useEffect(() => {
    cardStartRef.current = performance.now();
  }, [cardIndex, cards]);

  // Enter 단축키 — feedback 상태에서 다음 카드로 진행.
  useEnterToAdvance(phase === "feedback", () => {
    if (cardIndex >= cards.length - 1) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
    setPhase("playing");
    setPicked(null);
  });

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

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
          setPhase("playing");
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

  function handlePick(idx: number) {
    if (phase !== "playing") return;
    setPicked(idx);
    setPhase("feedback");
    const correct = idx === card!.problem.correctIndex;
    const elapsedMs = performance.now() - cardStartRef.current;
    void logEvent({
      gameId,
      cardId: card!.id,
      action: "submit",
      payload: { picked: idx, correct, elapsedMs },
    });
    // Plan A Phase 3 — modes wrapper 마이그레이션. 객관식 1턴 종결 메커닉:
    // 정답=wc 0 (good), 오답=wc 1 (again). resolveRating(default) 가 동일 결정.
    // Plan E Phase 2 — mode 전파 (URL ?mode=review-queue 등).
    // Plan E Phase 3 — time-attack 시 elapsedMs 전달.
    applyAndPersist(mode, gameId, card!.id, {
      correct,
      wrongCount: correct ? 0 : 1,
      hintUsed: false,
      elapsedMs,
    });
  }

  function handleTimeout() {
    if (phase !== "playing") return;
    setPhase("feedback");
    setPicked(null);
    void logEvent({
      gameId,
      cardId: card!.id,
      action: "submit",
      payload: { timeout: true, correct: false, elapsedMs: 30_001 },
    });
    applyAndPersist(mode, gameId, card!.id, {
      correct: false,
      wrongCount: 1,
      hintUsed: false,
      elapsedMs: 30_001,
    });
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
  const showBurst = phase === "feedback" && isCorrect;

  return (
    <>
      <CorrectBurst show={showBurst} />
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
          <p className="mt-3 text-helper text-type-secondary sm:mt-6 lg:mt-0">{card.unit}</p>
          <h1 className="mt-1.5 text-label text-type-secondary sm:mt-2">빈칸에 알맞은 말은?</h1>

          <motion.div
            className="mt-2 rounded-block border border-border-hairline bg-bg-block p-2.5 text-helper leading-relaxed text-type-primary sm:mt-3 sm:p-4 sm:text-body"
            animate={
              phase === "feedback" && !isCorrect
                ? { x: [0, -4, 4, -4, 4, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.32 }}
          >
            {passageNodes}
          </motion.div>

          {card.hint && phase === "playing" && (
            <p className="mt-2 text-helper text-type-secondary">힌트 · {card.hint}</p>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:mt-4">
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
          </div>

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
        </>
      }
      cta={
        phase === "feedback" ? (
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
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" && "보기를 골라주세요"}
          {phase === "feedback" &&
            (isCorrect ? "정답이에요" : "정답은 다른 보기였어요")}
        </span>
      }
    />
    </>
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
      disabled={phase !== "playing"}
      whileHover={phase === "playing" ? { scale: 1.01 } : undefined}
      whileTap={phase === "playing" ? { scale: 0.99 } : undefined}
      className={`block w-full rounded-block border px-3 py-2 text-left text-helper text-type-primary transition-colors sm:px-4 sm:py-3 sm:text-body ${stateClass}`}
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
