"use client";

// 객관식 4지선다 메커닉 — math-quick-quiz / english-blank / custom-multiple-choice 가
// 공유하는 일반화 컴포넌트. `2026-05-08_management.md` §8.2 따름.
//
// 본 게임이 만들어 놓은 카드 (또는 사용자 커스텀 카드) 를 그대로 받아 5-phase 풀이.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
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
import { useEnterToAdvance } from "./useEnterToAdvance";

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
  // PR #92 Codex round 4 fix: gameId 를 전달해 비지원 mode URL 직접 진입 시 default 로
  // 정규화 — `?mode=time-attack` 으로 4 메커니즘 미통합 게임 진입을 라우트 단에서 차단.
  const mode = useGameMode(gameId);
  const pathname = usePathname();
  // deep-recall 모드는 R<0.6 필터가 적용 — 신규 세션에선 풀이 0건이 보통.
  // initialCards 가 SSR/하드코딩 카드라 무조건 default 진입 시 사용 — deep-recall 진입 시
  // SRS load 전엔 빈 표시 (잘못된 화면) 피하려 default 모드 외엔 effect 가 cards 갱신 전까지 hidden.
  const [cards, setCards] = useState(() =>
    mode === "deep-recall" ? [] : initialCards,
  );
  const [cardsLoaded, setCardsLoaded] = useState(mode === "default");
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<number | null>(null);
  const dragStartedRef = useRef(false);
  // time-attack: 카드 진입 시각 — submit 시 elapsedMs 계산.
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
    // deep-recall 빈 풀(R<0.6 카드 0건)은 ordered=[] — DeepRecallEmpty 표시.
    // 그 외 모드는 0개 selected 케이스 X (review-queue 도 cards.length 보존).
    setCards(mode === "deep-recall" ? ordered : ordered.length > 0 ? ordered : initialCards);
    setCardsLoaded(true);
    void logEvent({ gameId, cardId: null, action: "session-start" });
    return () => {
      void logEvent({ gameId, cardId: null, action: "session-end" });
    };
  }, [gameId, mode, initialCards]);

  // 카드 진입 시 타이머 기준 시각 갱신 — time-attack elapsedMs 계산용.
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
    setPhase("idle");
    setPicked(null);
    dragStartedRef.current = false;
  });

  // 빈 카드 풀 — deep-recall 모드는 R<0.6 카드 0건 안내.
  if (cards.length === 0) {
    if (cardsLoaded && mode === "deep-recall" && initialCards.length > 0) {
      return (
        <DeepRecallEmpty homeHref={homeHref} defaultModeHref={pathname ?? "/"} />
      );
    }
    // PR #92 Codex round 3 fix: deep-recall 미로딩(`cardsLoaded=false`) 상태에서
    // 일반 empty-state 가 한 프레임 노출되는 회귀 차단. SRS load 후
    // DeepRecallEmpty 또는 게임 화면으로 안정 전환.
    if (mode === "deep-recall" && !cardsLoaded) {
      return null;
    }
    return (
      <main data-puds-state="empty" className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
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
    const elapsedMs = performance.now() - cardStartRef.current;
    void logEvent({
      gameId,
      cardId: card.id,
      action: "submit",
      payload: { picked: choiceIdx, correct, elapsedMs },
    });

    // Plan A Phase 3 — modes wrapper 마이그레이션. 객관식 1턴 종결.
    // Plan E Phase 3 — time-attack 시 elapsedMs 전달 (resolveRating 가 30s 초과 → again).
    applyAndPersist(mode, gameId, card.id, {
      correct,
      wrongCount: correct ? 0 : 1,
      hintUsed: false,
      elapsedMs,
    });
  };

  // time-attack 시간 초과 — 강제 오답 처리. correct=false + 30s 초과 elapsedMs →
  // resolveRating('time-attack') 가 again. 카드 답 노출 후 다음 카드 진행 가능 상태.
  const handleTimeout = () => {
    if (phase !== "idle") return;
    setPhase("feedback");
    setPicked(null);
    void logEvent({
      gameId,
      cardId: card.id,
      action: "submit",
      payload: { timeout: true, correct: false, elapsedMs: 30_001 },
    });
    applyAndPersist(mode, gameId, card.id, {
      correct: false,
      wrongCount: 1,
      hintUsed: false,
      elapsedMs: 30_001,
    });
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

  const showBurst =
    phase === "feedback" && picked === card.problem.correctIndex;

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
            active={mode === "time-attack" && phase === "idle"}
            resetKey={cardIndex}
            onExpire={handleTimeout}
          />
        </div>
      }
      content={
        <>
          <p className="mt-3 text-helper text-type-secondary sm:mt-6 lg:mt-0">{card.unit}</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight text-type-primary sm:mt-2 sm:text-display">
            {card.problem.question}
          </h1>
          {card.hint && (
            <p className="mt-1.5 text-helper text-type-secondary sm:mt-2">힌트 · {card.hint}</p>
          )}

          <div className="mt-4 flex flex-1 flex-col gap-2 sm:mt-8 sm:gap-3">
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
            다음 →
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "idle" && "선택지를 골라주세요"}
          {phase === "feedback" &&
            (picked === card.problem.correctIndex
              ? "정답이에요"
              : "정답은 다른 보기였어요")}
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
      disabled={phase !== "idle"}
      whileHover={phase === "idle" ? { scale: 1.01 } : undefined}
      whileTap={phase === "idle" ? { scale: 0.99 } : undefined}
      animate={
        phase === "feedback" && picked && !correct
          ? { x: [0, -4, 4, -4, 4, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.32 }}
      className={`block w-full rounded-block border px-4 py-3 text-left text-body text-type-primary transition-colors sm:px-5 sm:py-4 ${stateClass}`}
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
    <main data-puds-player-state="result" className="mx-auto flex min-h-full max-w-[480px] flex-col px-6 py-10">
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
