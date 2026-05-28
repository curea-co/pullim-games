"use client";

// 한국사 연표 정렬 — 사건 카드를 시간 순으로 슬롯에 배치.
// 같은 연도 사건은 problem.events 배열 순서를 정답으로 간주 (콘텐츠 큐레이터가 인과 순으로 입력).
// 모두 채워지면 자동 검증 → 정답 jade glow + 인과 점선, 오답 shake + 자동 reset.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { getCardSequence } from "./content";
import {
  applyAndPersist,
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  selectCardsForMode,
  useGameMode,
} from "@/lib/core";
import { useEnterClicksRef } from "@/components/game-mechanics/useEnterToAdvance";

const GAME_ID = "history-timeline";
const REVEAL_THRESHOLD = 5;
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

interface PoolEvent {
  id: string;
  title: string;
  year: number;
  /** 원래 정답 인덱스 (events 배열에서의 위치). */
  originIndex: number;
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

export default function HistoryTimelineGame() {
  const mode = useGameMode(GAME_ID);
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [wrongCount, setWrongCount] = useState(0);
  const dragStartedRef = useRef(false);
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  useEnterClicksRef(ctaRef);

  useEffect(() => {
    const all = loadAllSrsStates(GAME_ID);
    const allCards = getCardSequence();
    if (all.size > 0) {
      const withSrs = allCards.map((c) => ({
        card: c,
        srs: all.get(c.id) ?? loadSrsState(GAME_ID, c.id),
      }));
      const ordered = selectCardsForMode(withSrs, mode, allCards.length).map(
        (x) => x.card,
      );
      setCards(ordered);
    }
    void logEvent({ gameId: GAME_ID, cardId: null, action: "session-start" });
    return () => {
      void logEvent({ gameId: GAME_ID, cardId: null, action: "session-end" });
    };
  }, [mode]);

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  const poolEvents: PoolEvent[] = useMemo(() => {
    if (!card) return [];
    const items = card.problem.events.map((e, i) => ({
      id: `${card.id}-e${i}`,
      title: e.title,
      year: e.year,
      originIndex: i,
    }));
    return seededShuffle(items, card.id);
  }, [card]);

  const [slots, setSlots] = useState<(string | null)[]>(() =>
    card ? Array(card.problem.events.length).fill(null) : [],
  );

  useEffect(() => {
    if (!card) return;
    setSlots(Array(card.problem.events.length).fill(null));
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
  const availablePool = poolEvents.filter((pe) => !placedIds.has(pe.id));

  function placeEvent(eventId: string) {
    if (phase !== "playing") return;
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty === -1) return;
    if (!dragStartedRef.current) {
      dragStartedRef.current = true;
      void logEvent({ gameId: GAME_ID, cardId: card!.id, action: "drag-start" });
    }
    const next = [...slots];
    next[firstEmpty] = eventId;
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
    const orderedIndices = filledSlots.map((id) => {
      const ev = poolEvents.find((pe) => pe.id === id);
      return ev ? ev.originIndex : -1;
    });
    // 정답 = orderedIndices 가 [0,1,2,...]
    const correct = orderedIndices.every((idx, i) => idx === i);

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { correct, ordered: orderedIndices },
    });

    applyAndPersist(mode, GAME_ID, card!.id, {
      correct,
      wrongCount: correct ? wrongCount : wrongCount + 1,
      hintUsed: false,
    });

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
        const correctOrder: (string | null)[] = card!.problem.events.map(
          (_, i) => {
            const ev = poolEvents.find((pe) => pe.originIndex === i);
            return ev ? ev.id : null;
          },
        );
        setSlots(correctOrder);
        setPhase("reveal");
        return;
      }
      setPhase("wrong");
      setTimeout(() => {
        setSlots(Array(card!.problem.events.length).fill(null));
        setPhase("playing");
      }, 1400);
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
          <p className="mt-3 text-helper text-type-secondary sm:mt-6 lg:mt-0">{card.unit}</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight text-type-primary sm:mt-2 sm:text-display">{card.problem.era}</h1>
          <p className="mt-1.5 text-label text-type-secondary sm:mt-2">
            사건을 시간 순으로 놓아주세요
          </p>
          {card.hint && (
            <p className="mt-1 text-helper text-type-secondary">힌트 · {card.hint}</p>
          )}
          {phase === "reveal" && (
            <div className="mt-3">
              <RevealBanner attemptCount={wrongCount} />
            </div>
          )}

          {/* Slots — 시간축 (위→아래 = 과거→현재) */}
          <motion.div
            className="mt-2 flex flex-col gap-1.5 sm:mt-6 sm:gap-2"
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
        {slots.map((eventId, slotIdx) => {
          const ev = eventId
            ? poolEvents.find((pe) => pe.id === eventId)
            : null;
          return (
            <button
              key={`slot-${slotIdx}`}
              type="button"
              onClick={() => removeFromSlot(slotIdx)}
              disabled={phase !== "playing" || ev === null}
              className={`flex w-full items-center justify-between rounded-block border px-3 py-2 text-left text-body transition-colors sm:px-4 sm:py-3 ${
                isResolved && ev
                  ? "border-accent-positive bg-accent-positive/10 text-type-primary"
                  : ev
                    ? "border-type-primary bg-bg-block text-type-primary"
                    : "border-dashed border-border-hairline bg-bg-primary text-type-secondary"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="tabular text-helper text-type-secondary">
                  {slotIdx + 1}
                </span>
                <span>{ev?.title ?? "사건을 놓아주세요"}</span>
              </span>
              {isResolved && ev && (
                <span className="tabular text-helper text-type-secondary">
                  {ev.year}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Pool — 셔플된 사건 풀 */}
      <div className="mt-3 flex flex-1 flex-wrap items-start content-start gap-2 sm:mt-6">
        {availablePool.map((pe) => (
          <motion.button
            key={pe.id}
            type="button"
            onClick={() => placeEvent(pe.id)}
            disabled={phase !== "playing"}
            whileHover={phase === "playing" ? { scale: 1.03 } : undefined}
            whileTap={phase === "playing" ? { scale: 0.97 } : undefined}
            layout
            className="rounded-block border border-border-hairline bg-bg-block px-2 py-1 text-helper text-type-primary sm:px-3 sm:py-2 sm:text-body"
          >
            {pe.title}
          </motion.button>
        ))}
      </div>
        </>
      }
      cta={
        isResolved ? (
          <button
            ref={ctaRef}
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
          {phase === "playing" && "사건을 시간 순으로 놓아주세요"}
          {phase === "wrong" && "순서가 틀렸어요. 다시 해보세요."}
          {phase === "correct" && "정답이에요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 순서를 보여줄게요."}
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
          {totalCards}개 시기, 시간이 정리됐어요.
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
