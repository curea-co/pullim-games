"use client";

// 생물 분류 트리 — 카드를 카테고리 박스 또는 풀로 드래그.
// drag-end pointer 위치를 모든 zone bounding rect 와 비교 → 일치 zone 으로 assign.
// 답지 노출 X (wrong 시 카드별 정/오 강조 X, 정확도 n/m 만).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, type PanInfo } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { CategoryBox } from "./components/CategoryBox";
import { ItemCard } from "./components/ItemCard";
import { Pool } from "./components/Pool";
import { checkAssignments } from "./logic/checkAssignments";
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

const GAME_ID = "bio-taxonomy";
const POOL_ID = "pool" as const;
const REVEAL_THRESHOLD = 5;
type ZoneId = string; // categoryId | "pool"
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

/** 첫 카드의 모든 item 을 POOL_ID 로 채운 초기 assignments. SSR 첫 paint 부터
 *  poolItems 가 비어있지 않게 해서 "모든 카드를 배치했어요" flash 회피 (audit UX-1). */
function initialAssignments(
  cards: ReturnType<typeof getCardSequence>,
  cardIndex: number,
): Record<string, ZoneId> {
  const first = cards[cardIndex];
  if (!first) return {};
  const init: Record<string, ZoneId> = {};
  for (const item of first.problem.items) {
    init[item.id] = POOL_ID;
  }
  return init;
}

export default function BioTaxonomyGame() {
  const mode = useGameMode(GAME_ID);
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [sessionRound, setSessionRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [assignments, setAssignments] = useState<Record<string, ZoneId>>(
    () => initialAssignments(getCardSequence(), 0),
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingFocusRef = useRef<string | null>(null);
  const [dragOverZoneId, setDragOverZoneId] = useState<ZoneId | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [accuracy, setAccuracy] = useState<{
    correct: number;
    total: number;
  } | null>(null);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const poolRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  useEnterClicksRef(ctaRef);

  useEffect(() => {
    const all = loadAllSrsStates(GAME_ID);
    const allCards = getCardSequence();
    if (all.size > 0 || mode === "review-queue") {
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
    const initial: Record<string, ZoneId> = {};
    for (const item of card.problem.items) {
      initial[item.id] = POOL_ID;
    }
    setAssignments(initial);
    setSelectedItemId(null);
    setAnnouncement("");
    pendingFocusRef.current = null;
    setDragOverZoneId(null);
    setWrongCount(0);
    setAccuracy(null);
    setPhase("playing");
    categoryRefs.current = {};
  }, [cardIndex, card, sessionRound]);

  useEffect(() => {
    const itemId = pendingFocusRef.current;
    if (itemId) {
      itemRefs.current[itemId]?.focus();
      pendingFocusRef.current = null;
    }
  }, [assignments]);

  useEffect(() => {
    if (!selectedItemId || phase !== "playing") return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setSelectedItemId(null);
      setAnnouncement("선택을 취소했어요.");
      itemRefs.current[selectedItemId]?.focus();
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [selectedItemId, phase]);

  function selectItem(itemId: string) {
    if (phase !== "playing") return;
    const canceled = selectedItemId === itemId;
    setSelectedItemId(canceled ? null : itemId);
    const label = card?.problem.items.find((item) => item.id === itemId)?.label;
    setAnnouncement(canceled ? "선택을 취소했어요." : `${label} 선택. 분류 또는 카드 풀을 선택하세요. Esc로 취소할 수 있어요.`);
  }

  const poolItems = useMemo(() => {
    if (!card) return [];
    return card.problem.items.filter(
      (it) => assignments[it.id] === POOL_ID,
    );
  }, [card, assignments]);

  const itemsByCategory = useMemo(() => {
    const map: Record<string, typeof card.problem.items> = {};
    if (!card) return map;
    for (const cat of card.problem.categories) {
      map[cat.id] = card.problem.items.filter(
        (it) => assignments[it.id] === cat.id,
      );
    }
    return map;
  }, [card, assignments]);

  const allPlaced = useMemo(() => {
    if (!card) return false;
    return card.problem.items.every(
      (it) => assignments[it.id] && assignments[it.id] !== POOL_ID,
    );
  }, [card, assignments]);

  /** pointer 좌표가 어느 zone 안에 있는지 찾기. 없으면 null. */
  const hitTestZone = useCallback(
    (x: number, y: number): ZoneId | null => {
      if (!card) return null;
      for (const cat of card.problem.categories) {
        const rect = categoryRefs.current[cat.id]?.getBoundingClientRect();
        if (
          rect &&
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          return cat.id;
        }
      }
      const poolRect = poolRef.current?.getBoundingClientRect();
      if (
        poolRect &&
        x >= poolRect.left &&
        x <= poolRect.right &&
        y >= poolRect.top &&
        y <= poolRect.bottom
      ) {
        return POOL_ID;
      }
      return null;
    },
    [card],
  );

  if (phase === "completed") {
    return (
      <CompletionScreen
        totalCards={cards.length}
        onRetry={() => {
          setSessionRound((round) => round + 1);
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

  function handleDragStart(_itemId: string) {
    if (phase !== "playing") return;
    setSelectedItemId(null);
    setDragOverZoneId(null);
  }

  function handleDragEnd(itemId: string, info: PanInfo) {
    if (phase !== "playing") return;
    const zoneId = hitTestZone(info.point.x, info.point.y);
    setDragOverZoneId(null);

    if (zoneId === null) {
      // 빈 영역에 drop — 원위치 (framer-motion 이 자동 처리)
      void logEvent({
        gameId: GAME_ID,
        cardId: card!.id,
        action: "drag-end",
        payload: { itemId, hit: false },
      });
      return;
    }

    assignItem(itemId, zoneId);
  }

  function assignItem(itemId: string, zoneId: ZoneId, restoreFocus = false) {
    if (phase !== "playing") return;
    setSelectedItemId(null);
    const label = card!.problem.items.find((item) => item.id === itemId)?.label;
    const destination = zoneId === POOL_ID ? "카드 풀" : card!.problem.categories.find((cat) => cat.id === zoneId)?.label;
    setAnnouncement(`${label} 카드를 ${destination}로 옮겼어요.`);
    if (restoreFocus) pendingFocusRef.current = itemId;
    setAssignments((prev) => {
      return { ...prev, [itemId]: zoneId };
    });
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { itemId, zoneId },
    });
  }

  function handleCheck() {
    if (phase !== "playing" || !allPlaced) return;
    setPhase("checking");
    // checkAssignments 의 string|null 시그니처에 맞게 POOL_ID → null 변환
    const forCheck: Record<string, string | null> = {};
    for (const [itemId, zone] of Object.entries(assignments)) {
      forCheck[itemId] = zone === POOL_ID ? null : zone;
    }
    const result = checkAssignments(forCheck, card!.problem.items);
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
          const correctAssignments: Record<string, ZoneId> = {};
          for (const item of card!.problem.items) {
            correctAssignments[item.id] = item.categoryId;
          }
          setAssignments(correctAssignments);
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
  const disabled = phase !== "playing";
  const categoryGridClass =
    card.problem.categories.length === 2
      ? "grid-cols-2"
      : card.problem.categories.length === 3
        ? "grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";

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
            href="/home"
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
            {card.problem.title}
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

          <p id="bio-input-help" className="mt-2 text-helper text-type-secondary">
            카드를 누르거나 Enter·Space로 선택한 뒤 분류를 선택하세요. 같은 카드를 다시 선택하거나 Esc로 취소할 수 있어요.
          </p>
          <p className="mt-1 text-helper text-type-secondary" role="status" aria-atomic="true">{announcement}</p>
          {/* 카테고리 박스들 */}
          <motion.div
            className={`mt-6 grid gap-2 ${categoryGridClass}`}
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
            {card.problem.categories.map((cat, idx) => (
              <CategoryBox
                key={cat.id}
                category={cat}
                canAssign={selectedItemId !== null && !disabled}
                onAssign={() => { if (selectedItemId) assignItem(selectedItemId, cat.id, true); }}
                colorIndex={idx}
                dragOver={dragOverZoneId === cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el;
                }}
              >
                {(itemsByCategory[cat.id] ?? []).map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selected={selectedItemId === item.id}
                    onSelect={() => selectItem(item.id)}
                    itemRef={(el) => { itemRefs.current[item.id] = el; }}
                    placed
                    categoryColorIndex={idx}
                    disabled={disabled}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={(info) => handleDragEnd(item.id, info)}
                  />
                ))}
              </CategoryBox>
            ))}
          </motion.div>

          {/* 풀 (미배치 카드) */}
          <div className="mt-6">
            <Pool
              ref={poolRef}
              canReturn={!disabled && selectedItemId !== null && assignments[selectedItemId] !== POOL_ID}
              onReturn={() => { if (selectedItemId) assignItem(selectedItemId, POOL_ID, true); }}
              dragOver={dragOverZoneId === POOL_ID}
              hasItems={poolItems.length > 0}
            >
              {poolItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedItemId === item.id}
                  onSelect={() => selectItem(item.id)}
                    itemRef={(el) => { itemRefs.current[item.id] = el; }}
                  placed={false}
                  categoryColorIndex={null}
                  disabled={disabled}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={(info) => handleDragEnd(item.id, info)}
                />
              ))}
            </Pool>
          </div>

          <p
            className="mt-3 text-center text-helper text-type-secondary"
            aria-hidden="true"
          >
            {phase === "wrong" && accuracy
              ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
              : phase === "correct"
                ? "모든 카드가 알맞은 분류에 들어갔어요"
                : "카드를 끌어 알맞은 카테고리에 놓으세요"}
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
            ref={ctaRef}
            type="button"
            onClick={handleNext}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10"
          >
            {isLastCard ? "마치기 →" : "다음 →"}
          </button>
        ) : (
          <button
            ref={ctaRef}
            type="button"
            onClick={handleCheck}
            disabled={phase !== "playing" || !allPlaced}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            정답 확인
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" && "카드를 끌어 알맞은 카테고리에 놓으세요"}
          {phase === "wrong" && accuracy
            ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
            : ""}
          {phase === "correct" && "모든 카드가 알맞은 분류에 들어갔어요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 분류를 보여줄게요."}
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
          {totalCards}개 분류 카드, 모두 풀었어요.
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
          href="/home"
          className="block w-full rounded-button border border-border-hairline bg-bg-block px-4 py-3 text-center text-body text-type-primary"
        >
          다른 게임
        </Link>
        <Link
          href="/home"
          className="block w-full px-4 py-3 text-center text-body text-type-secondary hover:text-type-primary"
        >
          오늘은 끝
        </Link>
      </footer>
    </main>
  );
}
