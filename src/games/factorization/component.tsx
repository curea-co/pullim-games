"use client";

// 인수분해 블록 분리 — V0.3: FSRS 우선순위 큐 + 이벤트 로깅 + localStorage 영속.
// SPEC §03 M5 (5문제 카드 시퀀스), §04.4 인터랙션 상태 매트릭스.
//
// Phase 흐름:
//   idle → dragging → extracting → done → (다음 카드 또는 completed)
//   completed: 5문제 완료 화면 ("한 번 더" / "다른 게임" / "오늘은 끝")

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { TermBlock } from "./components/TermBlock";
import { DropZone } from "./components/DropZone";
import {
  assertAllTermsHaveCommonPart,
  extractCommonFactor,
} from "./logic/transform";
import { getCardSequence } from "./content";
import type { Term as UiTerm } from "./logic/types";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
  type CardSrsState,
} from "@/lib/core";

const GAME_ID = "factorization";

type Phase = "idle" | "dragging" | "extracting" | "done" | "completed";

const DRAG_THRESHOLD_PX = 50;

export default function FactorizationGame() {
  // 카드 시퀀스 — FSRS 우선순위 큐로 정렬, 클라이언트 마운트 후 결정.
  // SSR 단계에선 in-order, 클라이언트에서 localStorage 읽고 재정렬.
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragMagnitude, setDragMagnitude] = useState(0);
  const dragStartLoggedRef = useRef(false);

  // 클라이언트 마운트 시: FSRS 큐 정렬 + session-start 이벤트
  useEffect(() => {
    const all = loadAllSrsStates(GAME_ID);
    const allCards = getCardSequence();
    if (all.size > 0) {
      // SRS 상태 있는 카드만 우선순위로, 새 카드는 후반부에
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

  if (phase === "completed") {
    return (
      <CompletionScreen
        totalCards={cards.length}
        onRetry={() => {
          setCardIndex(0);
          setPhase("idle");
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

  // 카드 데이터 검증 (silent miscompute 차단)
  assertAllTermsHaveCommonPart(card.problem.terms);

  const factored = extractCommonFactor(
    card.problem.terms,
    card.problem.commonFactor,
  );

  const handleDragMove = (offsetY: number) => {
    const upward = Math.max(0, -offsetY);
    setDragMagnitude(upward);
    if (phase === "idle" && upward > 8) {
      setPhase("dragging");
      if (!dragStartLoggedRef.current) {
        dragStartLoggedRef.current = true;
        void logEvent({
          gameId: GAME_ID,
          cardId: card.id,
          action: "drag-start",
        });
      }
    } else if (phase === "dragging" && upward < 4) {
      setPhase("idle");
    }
  };

  const handleDragEnd = (_info: PanInfo) => {
    const success = dragMagnitude > DRAG_THRESHOLD_PX;
    void logEvent({
      gameId: GAME_ID,
      cardId: card.id,
      action: "drag-end",
      payload: { success, magnitude: Math.round(dragMagnitude) },
    });
    if (success) {
      setPhase("extracting");
      setTimeout(() => {
        setPhase("done");
        // FSRS state 갱신 + 영속화
        const prev: CardSrsState = loadSrsState(GAME_ID, card.id);
        const next = reviewCard(prev, "good");
        saveSrsState(GAME_ID, card.id, next);
        void logEvent({
          gameId: GAME_ID,
          cardId: card.id,
          action: "transform",
          payload: { reviewCount: next.reviewCount },
        });
        void logEvent({
          gameId: GAME_ID,
          cardId: card.id,
          action: "submit",
        });
      }, 240);
    } else {
      setPhase("idle");
    }
    setDragMagnitude(0);
    dragStartLoggedRef.current = false;
  };

  const handleNext = () => {
    if (isLastCard) {
      setPhase("completed");
    } else {
      setCardIndex(cardIndex + 1);
      setPhase("idle");
      dragStartLoggedRef.current = false;
    }
  };

  return (
    <GameShell
      variant="stack"
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
          <p className="mt-6 text-body text-type-secondary">{card.hint}</p>
          <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-8">
            <AnimatePresence mode="wait">
              {phase !== "done" ? (
                <BeforeView
                  key={`${cardIndex}-before`}
                  terms={card.problem.terms}
                  draggable={phase !== "extracting"}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  transforming={phase === "extracting"}
                />
              ) : (
                <AfterView
                  key={`${cardIndex}-after`}
                  factor={factored.factor}
                  remainders={factored.remainders}
                />
              )}
            </AnimatePresence>

            {phase !== "done" && (
              <DropZone
                active={phase === "dragging"}
                previewText={
                  phase === "dragging" ? card.problem.factoredForm : undefined
                }
              />
            )}
          </div>
        </>
      }
      cta={
        phase === "done" ? (
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
          {phase === "idle" && `${cardIndex + 1}번 문제. 블록을 위로 끌어 공통인수를 빼내세요`}
          {phase === "dragging" && "드롭 존이 활성화됐어요. 놓으면 변형됩니다."}
          {phase === "extracting" && "변형 중"}
          {phase === "done" &&
            (isLastCard
              ? "마지막 문제 완료. 마치기를 누르세요."
              : "다음 문제로 가세요.")}
        </span>
      }
    />
  );
}

interface BeforeViewProps {
  terms: UiTerm[];
  draggable: boolean;
  onDragMove: (offsetY: number) => void;
  onDragEnd: (info: PanInfo) => void;
  transforming: boolean;
}

function BeforeView({
  terms,
  draggable,
  onDragMove,
  onDragEnd,
  transforming,
}: BeforeViewProps) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, y: 6 }}
      animate={
        transforming
          ? { opacity: 0.4, scale: 0.92 }
          : { opacity: 1, scale: 1, y: 0 }
      }
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      {terms.map((term, idx) => (
        <Fragment key={term.id}>
          {idx > 0 && (
            <span
              aria-hidden="true"
              className="text-display text-type-secondary"
            >
              +
            </span>
          )}
          <TermBlock
            term={term}
            draggable={draggable}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        </Fragment>
      ))}
    </motion.div>
  );
}

interface AfterViewProps {
  factor: { id: string; text: string };
  remainders: UiTerm[];
}

function AfterView({ factor, remainders }: AfterViewProps) {
  return (
    <motion.div
      className="flex items-center gap-2 rounded-block border border-border-hairline bg-bg-block px-5 py-3.5"
      initial={{
        opacity: 0,
        scale: 0.92,
        boxShadow: "0 0 24px rgba(0,212,161,0.4)",
      }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: "0 0 0 rgba(0,212,161,0)",
      }}
      transition={{
        opacity: { duration: 0.18 },
        scale: { type: "spring", stiffness: 280, damping: 24 },
        boxShadow: { duration: 0.6, ease: "easeOut", delay: 0.18 },
      }}
    >
      <span className="rounded-sm bg-accent-positive/15 px-1 py-0.5 text-display tabular text-type-primary">
        {factor.text}
      </span>
      <span aria-hidden="true" className="text-display text-type-secondary">
        ·
      </span>
      <span className="text-display tabular text-type-primary">(</span>
      {remainders.map((r, idx) => (
        <Fragment key={r.id}>
          {idx > 0 && (
            <span
              aria-hidden="true"
              className="text-display text-type-secondary"
            >
              +
            </span>
          )}
          <span className="text-display tabular text-type-primary">
            {r.parts.map((p) => p.text).join("")}
          </span>
        </Fragment>
      ))}
      <span className="text-display tabular text-type-primary">)</span>
    </motion.div>
  );
}

interface CompletionScreenProps {
  totalCards: number;
  onRetry: () => void;
}

/** 5문제 완료 화면 — SPEC §03.3 IA + §07 microcopy 준수.
 *  3개 액션 동등 비중. 폭죽/이모지 X. */
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
          오늘 푼 {totalCards}문제,
          <br />
          머리에 박혔어요.
        </motion.h1>

        <motion.p
          className="text-body text-type-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          내일 또 봐요.
        </motion.p>
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
          className="block w-full rounded-button border border-border-hairline bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-bg-primary"
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
