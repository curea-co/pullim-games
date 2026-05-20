"use client";

// 인수분해 블록 분리 — drag-to-chip 메커닉.
// plan 2026-05-14_factorization-discrimination §1·§2.
//
// 메커닉:
//   1) 다항식 블록 표시 (jade 하이라이트 X — 정답 노출 회피).
//   2) 후보 chip 3 개 (1 정답 + 2 distractors, shuffle).
//   3) term block 을 chip 위로 드래그 → release → chip hit-test.
//      - 정답 chip → extracting → done (jade 노출).
//      - 오답 chip → wrong-flash + 시도 카운트 증가 + spring-back.
//      - 빈 공간 release → 변동 없음 (BUG-2 hit-test 정합성 보존).
//   4) 시도 3 회 후 "정답을 보여드릴게요" voluntary reveal 옵션 노출.
//   5) 시도 5 회 도달 (REVEAL_THRESHOLD) 시 auto reveal (correct-feedback 공통 룰).
//   6) FSRS 등급: attempt 1 → good, 2 → hard, 3+ → again. reveal → again.
//
// Phase 흐름:
//   idle → dragging → extracting → done → (다음 카드 또는 completed)
//   reveal: voluntary or auto. extracting 와 다른 분기 (FSRS=again).

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { TermBlock } from "./components/TermBlock";
import { FactorChipRack } from "./components/FactorChipRack";
import {
  assertAllTermsHaveCommonPart,
  extractCommonFactor,
} from "./logic/transform";
import { getCardSequence } from "./content";
import type { Term as UiTerm } from "./logic/types";
import type { FactorizationCard } from "./schema";
import {
  applyAndPersist,
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  selectCardsForMode,
  useGameMode,
} from "@/lib/core";

const GAME_ID = "factorization";
const REVEAL_THRESHOLD = 5;
const VOLUNTARY_REVEAL_AT = 3;

type Phase =
  | "idle"
  | "dragging"
  | "extracting"
  | "done"
  | "reveal"
  | "completed";

/** cardId 기반 deterministic shuffle (FY). 같은 카드면 항상 같은 순서. */
function shuffleCandidates(correct: string, distractors: string[], cardId: string): string[] {
  const arr = [correct, ...distractors];
  let seed = 0;
  for (let i = 0; i < cardId.length; i += 1) {
    seed = (seed * 31 + cardId.charCodeAt(i)) >>> 0;
  }
  for (let i = arr.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export default function FactorizationGame() {
  const mode = useGameMode(GAME_ID);
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hoveringChip, setHoveringChip] = useState<string | null>(null);
  const [wrongFlashChip, setWrongFlashChip] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const dragStartLoggedRef = useRef(false);
  // chip text → DOM element. 부모가 직접 boundingClientRect hit-test.
  const chipRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // 클라이언트 마운트 시: FSRS 큐 정렬 + session-start 이벤트
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
  }, [mode]);

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  // 카드별 chip 후보 (정답 + distractors, deterministic shuffle)
  const candidates = useMemo(
    () => (card ? buildCandidates(card) : []),
    [card],
  );

  const onChipMount = useCallback((text: string, el: HTMLDivElement | null) => {
    if (el) chipRefsRef.current.set(text, el);
    else chipRefsRef.current.delete(text);
  }, []);

  if (phase === "completed") {
    return (
      <CompletionScreen
        totalCards={cards.length}
        onRetry={() => {
          setCardIndex(0);
          setPhase("idle");
          setWrongCount(0);
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

  assertAllTermsHaveCommonPart(card.problem.terms);

  const factored = extractCommonFactor(
    card.problem.terms,
    card.problem.commonFactor,
  );

  /** chip rect 포함 여부 (point in rect). */
  function chipAt(point: { x: number; y: number }): string | null {
    for (const [text, el] of chipRefsRef.current) {
      const rect = el.getBoundingClientRect();
      if (
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom
      ) {
        return text;
      }
    }
    return null;
  }

  const handleDragMove = (info: PanInfo) => {
    if (phase === "idle") {
      setPhase("dragging");
      if (!dragStartLoggedRef.current) {
        dragStartLoggedRef.current = true;
        void logEvent({
          gameId: GAME_ID,
          cardId: card.id,
          action: "drag-start",
        });
      }
    }
    // pointer 위치로 chip hover 시각 피드백
    setHoveringChip(chipAt({ x: info.point.x, y: info.point.y }));
  };

  const handleDragEnd = (_info: PanInfo, blockRect: DOMRect) => {
    // block element center 가 어떤 chip rect 안인지 — 시각적 위치 기준 hit-test
    // (BUG-2 fix 정합성 보존: mouse pointer 아님).
    const blockCenter = {
      x: blockRect.left + blockRect.width / 2,
      y: blockRect.top + blockRect.height / 2,
    };
    const hitChip = chipAt(blockCenter);
    const correctText = card.problem.commonFactor;

    setHoveringChip(null);
    dragStartLoggedRef.current = false;

    if (hitChip === null) {
      // 빈 공간 release — 변동 없음 (시도 카운트 변동 X)
      void logEvent({
        gameId: GAME_ID,
        cardId: card.id,
        action: "drag-end",
        payload: { success: false, hitChip: null },
      });
      setPhase("idle");
      return;
    }

    const success = hitChip === correctText;
    void logEvent({
      gameId: GAME_ID,
      cardId: card.id,
      action: "drag-end",
      payload: { success, hitChip, wrongCount },
    });

    if (success) {
      const attempt = wrongCount + 1;
      setPhase("extracting");
      setTimeout(() => {
        setPhase("done");
        // Plan A Phase 3 — modes wrapper. attempt=1→wc 0(good), attempt=2→wc 1(hard), 그외 again.
        applyAndPersist(mode, GAME_ID, card.id, {
          correct: true,
          wrongCount,
          hintUsed: false,
        });
        void logEvent({
          gameId: GAME_ID,
          cardId: card.id,
          action: "transform",
          payload: { attempt },
        });
        void logEvent({
          gameId: GAME_ID,
          cardId: card.id,
          action: "submit",
        });
      }, 240);
      return;
    }

    // 오답 chip — wrong-flash 200ms + 시도 카운트 증가 + spring-back
    setWrongFlashChip(hitChip);
    setTimeout(() => setWrongFlashChip(null), 200);

    const nextWrong = wrongCount + 1;
    setWrongCount(nextWrong);
    if (nextWrong >= REVEAL_THRESHOLD) {
      triggerReveal(nextWrong, "auto");
    } else {
      setPhase("idle");
    }
  };

  function triggerReveal(attemptCount: number, source: "auto" | "voluntary") {
    applyAndPersist(mode, GAME_ID, card!.id, {
      correct: false,
      wrongCount: attemptCount,
      hintUsed: false,
    });
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { reveal: true, source, wrongCount: attemptCount },
    });
    setPhase("reveal");
  }

  const handleVoluntaryReveal = () => {
    if (phase !== "idle" && phase !== "dragging") return;
    triggerReveal(wrongCount, "voluntary");
  };

  const handleNext = () => {
    if (isLastCard) {
      setPhase("completed");
    } else {
      setCardIndex(cardIndex + 1);
      setPhase("idle");
      setWrongCount(0);
      setHoveringChip(null);
      setWrongFlashChip(null);
      dragStartLoggedRef.current = false;
    }
  };

  const isResolved = phase === "done" || phase === "reveal";
  const showVoluntaryReveal =
    wrongCount >= VOLUNTARY_REVEAL_AT &&
    wrongCount < REVEAL_THRESHOLD &&
    (phase === "idle" || phase === "dragging");

  return (
    <>
      <CorrectBurst show={phase === "extracting"} />
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
          {phase === "reveal" && (
            <div className="mt-3">
              <RevealBanner attemptCount={wrongCount} />
            </div>
          )}
          <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-8">
            <AnimatePresence mode="wait">
              {!isResolved ? (
                <BeforeView
                  key={`${cardIndex}-before`}
                  terms={card.problem.terms}
                  draggable={phase !== "extracting"}
                  revealCommon={phase === "extracting"}
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

            {!isResolved && (
              <FactorChipRack
                candidates={candidates}
                hoveringText={hoveringChip}
                wrongFlashText={wrongFlashChip}
                onChipMount={onChipMount}
              />
            )}

            {showVoluntaryReveal && (
              <button
                type="button"
                onClick={handleVoluntaryReveal}
                className="rounded-button border border-border-hairline px-3 py-2 text-helper text-type-secondary hover:text-type-primary"
              >
                정답을 보여드릴게요
              </button>
            )}
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
          {phase === "idle" && `${cardIndex + 1}번 문제. 블록을 공통인수 후보 chip 위로 끌어내세요`}
          {phase === "dragging" && (hoveringChip ? `${hoveringChip} chip 위. 놓으면 검증돼요.` : "chip 위로 가져가세요.")}
          {phase === "extracting" && "정답이에요. 변형 중"}
          {phase === "done" &&
            (isLastCard
              ? "마지막 문제 완료. 마치기를 누르세요."
              : "다음 문제로 가세요.")}
          {phase === "reveal" &&
            "여러 번 시도했어요. 정답을 보여줄게요."}
        </span>
      }
    />
    </>
  );
}

/** card → chip 후보 3개 (정답 + distractors, deterministic shuffle).
 *  distractors 가 누락된 카드는 fallback (정답만 노출) — buildCard 가 자동
 *  생성하므로 실제로는 발생 안 함. */
function buildCandidates(card: FactorizationCard): string[] {
  const correct = card.problem.commonFactor;
  const distractors = card.problem.distractors ?? [];
  if (distractors.length !== 2) return [correct];
  return shuffleCandidates(correct, [...distractors], card.id);
}

interface BeforeViewProps {
  terms: UiTerm[];
  draggable: boolean;
  revealCommon: boolean;
  onDragMove: (info: PanInfo) => void;
  onDragEnd: (info: PanInfo, blockRect: DOMRect) => void;
  transforming: boolean;
}

function BeforeView({
  terms,
  draggable,
  revealCommon,
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
            revealCommon={revealCommon}
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
