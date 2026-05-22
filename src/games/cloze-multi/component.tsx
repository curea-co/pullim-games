"use client";

// 다중 빈칸 cloze — 본문 + 카드 풀. 카드 active → 슬롯 탭 = 배치. 슬롯 탭 = 풀 복귀.
// 답지 노출 X — wrong 시 정확도만, 슬롯별 정/오 강조 X (학생 전체 재검토 강제).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { ClozePassage } from "./components/ClozePassage";
import { CardPalette } from "./components/CardPalette";
import { checkCloze } from "./logic/checkCloze";
import type { ClozeCard } from "./schema";
import { getCardSequence } from "./content";
import {
  applyAndPersist,
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  selectCardsForMode,
  useGameMode,
} from "@/lib/core";

const GAME_ID = "cloze-multi";
const REVEAL_THRESHOLD = 5;
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

export default function ClozeMultiGame() {
  const mode = useGameMode(GAME_ID);
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  /** slotId → cardId. 미배치 슬롯은 키 자체가 없거나 null. */
  const [placementMap, setPlacementMap] = useState<Record<string, string | null>>(
    {},
  );
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [accuracy, setAccuracy] = useState<{
    correct: number;
    total: number;
  } | null>(null);

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

  useEffect(() => {
    if (!card) return;
    setPlacementMap({});
    setActiveCardId(null);
    setWrongCount(0);
    setAccuracy(null);
    setPhase("playing");
  }, [cardIndex, card]);

  const placedCardIds = useMemo(() => {
    const set = new Set<string>();
    for (const v of Object.values(placementMap)) {
      if (v) set.add(v);
    }
    return set;
  }, [placementMap]);

  const availableCards: ClozeCard[] = useMemo(() => {
    if (!card) return [];
    return card.problem.cards.filter((c) => !placedCardIds.has(c.id));
  }, [card, placedCardIds]);

  const placementsByBlankOrder: (string | null)[] = useMemo(() => {
    if (!card) return [];
    return card.problem.blanks.map((b) => placementMap[b.id] ?? null);
  }, [card, placementMap]);

  const placementsBySlotForUi = useMemo(() => {
    const map = new Map<string, ClozeCard | null>();
    if (!card) return map;
    for (const b of card.problem.blanks) {
      const cid = placementMap[b.id];
      const c = cid ? card.problem.cards.find((x) => x.id === cid) : null;
      map.set(b.id, c ?? null);
    }
    return map;
  }, [card, placementMap]);

  const allFilled = useMemo(
    () => card !== undefined && placementsByBlankOrder.every((p) => p !== null),
    [card, placementsByBlankOrder],
  );

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

  function pickCard(cardId: string) {
    if (phase !== "playing") return;
    setActiveCardId((prev) => (prev === cardId ? null : cardId));
  }

  function tapSlot(slotId: string) {
    if (phase !== "playing") return;
    const occupant = placementMap[slotId];
    if (occupant) {
      // 슬롯에 카드가 있으면 풀로 복귀
      setPlacementMap((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      void logEvent({
        gameId: GAME_ID,
        cardId: card!.id,
        action: "transform",
        payload: { slotId, removed: occupant },
      });
      return;
    }
    if (!activeCardId) return;
    // 빈 슬롯 + active 카드 = 배치
    setPlacementMap((prev) => ({ ...prev, [slotId]: activeCardId }));
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { slotId, placed: activeCardId },
    });
    setActiveCardId(null);
  }

  function handleCheck() {
    if (phase !== "playing" || !allFilled) return;
    setPhase("checking");
    const result = checkCloze(placementsByBlankOrder, card!.problem.blanks);
    setAccuracy({ correct: result.correctCount, total: result.totalCount });

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: {
        correct: result.allCorrect,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
      },
    });

    setTimeout(() => {
      if (result.allCorrect) {
        applyAndPersist(mode, GAME_ID, card!.id, {
          correct: true,
          wrongCount,
          hintUsed: false,
        });
        setPhase("correct");
      } else {
        const nextWrong = wrongCount + 1;
        setWrongCount(nextWrong);
        if (nextWrong >= REVEAL_THRESHOLD) {
          applyAndPersist(mode, GAME_ID, card!.id, {
            correct: false,
            wrongCount: nextWrong,
            hintUsed: false,
          });
          void logEvent({
            gameId: GAME_ID,
            cardId: card!.id,
            action: "transform",
            payload: { reveal: true, wrongCount: nextWrong },
          });
          const correctMap: Record<string, string | null> = {};
          for (const b of card!.problem.blanks) {
            correctMap[b.id] = b.correctCardId;
          }
          setPlacementMap(correctMap);
          setActiveCardId(null);
          setPhase("reveal");
          return;
        }
        setPhase("wrong");
        setTimeout(() => setPhase("playing"), 1200);
      }
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
          <p className="mt-6 text-helper text-type-secondary lg:mt-0">
            {card.unit}
          </p>
          <h1 className="mt-2 text-display text-type-primary">
            문장의 빈칸에 단어를 끼워주세요
          </h1>
          {card.hint && (
            <p className="mt-1 text-helper text-type-secondary">
              힌트 · {card.hint}
            </p>
          )}
          {phase === "reveal" && (
            <div className="mt-3">
              <RevealBanner attemptCount={wrongCount} />
            </div>
          )}

          <motion.div
            className="mt-8 flex justify-center"
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
            <ClozePassage
              passage={card.problem.passage}
              placements={placementsBySlotForUi}
              activeSlotId={null}
              disabled={phase !== "playing"}
              onSlotTap={tapSlot}
            />
          </motion.div>

          <div className="mt-8">
            <CardPalette
              available={availableCards}
              activeCardId={activeCardId}
              disabled={phase !== "playing"}
              onPick={pickCard}
            />
          </div>

          <p
            className="mt-4 text-center text-helper text-type-secondary"
            aria-hidden="true"
          >
            {phase === "wrong" && accuracy
              ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
              : phase === "correct"
                ? "모든 빈칸이 정답이에요"
                : activeCardId
                  ? "빈칸을 탭해 카드를 놓아주세요"
                  : "카드를 선택한 뒤 빈칸을 탭해주세요"}
          </p>
          {wrongCount > 0 && phase !== "correct" && (
            <p className="mt-1 text-center text-helper tabular text-type-secondary">
              오답 {wrongCount}회
            </p>
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
            onClick={handleCheck}
            disabled={phase !== "playing" || !allFilled}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            정답 확인
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" &&
            (activeCardId
              ? "빈칸을 탭해 카드를 놓아주세요"
              : "카드를 선택한 뒤 빈칸을 탭해주세요")}
          {phase === "wrong" && accuracy
            ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
            : ""}
          {phase === "correct" && "모든 빈칸이 정답이에요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 카드를 보여줄게요."}
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
          {totalCards}문장, 빈칸을 모두 메웠어요.
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
