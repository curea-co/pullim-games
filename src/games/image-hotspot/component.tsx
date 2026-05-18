"use client";

// 이미지 핫스팟 — SVG 도식 위 영역 + 라벨 풀. 카드 active → 영역 탭 = 배치. 영역 탭 = 풀 복귀.
// 답지 노출 X — wrong 시 정확도만, 영역별 정/오 강조 X.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { HotspotCanvas } from "./components/HotspotCanvas";
import { LabelPalette } from "./components/LabelPalette";
import { checkHotspot } from "./logic/checkHotspot";
import type { LabelCard } from "./schema";
import { getCardSequence } from "./content";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsAndRecord,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "image-hotspot";
const REVEAL_THRESHOLD = 5;
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

export default function ImageHotspotGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
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

  const availableCards: LabelCard[] = useMemo(() => {
    if (!card) return [];
    return card.problem.cards.filter((c) => !placedCardIds.has(c.id));
  }, [card, placedCardIds]);

  const placementsByOrder: (string | null)[] = useMemo(() => {
    if (!card) return [];
    return card.problem.regions.map((r) => placementMap[r.id] ?? null);
  }, [card, placementMap]);

  const placementsByRegionForUi = useMemo(() => {
    const map = new Map<string, LabelCard | null>();
    if (!card) return map;
    for (const r of card.problem.regions) {
      const cid = placementMap[r.id];
      const c = cid ? card.problem.cards.find((x) => x.id === cid) : null;
      map.set(r.id, c ?? null);
    }
    return map;
  }, [card, placementMap]);

  const allFilled = useMemo(
    () => card !== undefined && placementsByOrder.every((p) => p !== null),
    [card, placementsByOrder],
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

  function tapRegion(regionId: string) {
    if (phase !== "playing") return;
    const occupant = placementMap[regionId];
    if (occupant) {
      setPlacementMap((prev) => {
        const next = { ...prev };
        delete next[regionId];
        return next;
      });
      void logEvent({
        gameId: GAME_ID,
        cardId: card!.id,
        action: "transform",
        payload: { regionId, removed: occupant },
      });
      return;
    }
    if (!activeCardId) return;
    setPlacementMap((prev) => ({ ...prev, [regionId]: activeCardId }));
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { regionId, placed: activeCardId },
    });
    setActiveCardId(null);
  }

  function handleCheck() {
    if (phase !== "playing" || !allFilled) return;
    setPhase("checking");
    const result = checkHotspot(placementsByOrder, card!.problem.regions);
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
        const rating =
          wrongCount === 0 ? "good" : wrongCount <= 1 ? "hard" : "again";
        const prev = loadSrsState(GAME_ID, card!.id);
        const updated = reviewCard(prev, rating);
        saveSrsAndRecord(GAME_ID, card!.id, updated);
        setPhase("correct");
      } else {
        const nextWrong = wrongCount + 1;
        setWrongCount(nextWrong);
        if (nextWrong >= REVEAL_THRESHOLD) {
          const prev = loadSrsState(GAME_ID, card!.id);
          const updated = reviewCard(prev, "again");
          saveSrsAndRecord(GAME_ID, card!.id, updated);
          void logEvent({
            gameId: GAME_ID,
            cardId: card!.id,
            action: "transform",
            payload: { reveal: true, wrongCount: nextWrong },
          });
          const correctMap: Record<string, string | null> = {};
          for (const r of card!.problem.regions) {
            correctMap[r.id] = r.correctCardId;
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
          <p className="mt-3 text-helper text-type-secondary sm:mt-6 lg:mt-0">
            {card.unit}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight text-type-primary sm:mt-2 sm:text-display">
            그림 위 영역에 라벨을 끼워주세요
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
            className="mt-3 flex justify-center sm:mt-6"
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
            <HotspotCanvas
              diagramId={card.problem.diagramId}
              regions={card.problem.regions}
              placements={placementsByRegionForUi}
              disabled={phase !== "playing"}
              onTap={tapRegion}
            />
          </motion.div>

          <div className="mt-3 sm:mt-6">
            <LabelPalette
              available={availableCards}
              activeCardId={activeCardId}
              disabled={phase !== "playing"}
              onPick={pickCard}
            />
          </div>

          <p
            className="mt-2 text-center text-helper text-type-secondary sm:mt-4"
            aria-hidden="true"
          >
            {phase === "wrong" && accuracy
              ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
              : phase === "correct"
                ? "모든 영역이 정답이에요"
                : activeCardId
                  ? "영역을 탭해 라벨을 놓아주세요"
                  : "라벨을 선택한 뒤 영역을 탭해주세요"}
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
              ? "영역을 탭해 라벨을 놓아주세요"
              : "라벨을 선택한 뒤 영역을 탭해주세요")}
          {phase === "wrong" && accuracy
            ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
            : ""}
          {phase === "correct" && "모든 영역이 정답이에요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 라벨을 보여줄게요."}
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
          {totalCards}장, 식물 구조를 모두 찾았어요.
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
