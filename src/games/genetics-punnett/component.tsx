"use client";

// 펀넷 사각형 비율 — 부모 유전자형 표시 → 자손 격자 자동 채움 →
// 학생이 표현형 비율 입력 → "정답 확인" → 약분 동치 비교.
//
// Phase 흐름: playing → checking → correct/wrong → next or completed
//   - 답지 노출 X (correct 진입 전 색칠 없음 — 끼워맞추기 회피)
//   - retrieval depth deep: 우성/열성 판정 후 빈도 추론

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { PunnettGrid } from "./components/PunnettGrid";
import { RatioInput } from "./components/RatioInput";
import { checkRatio } from "./logic/checkRatio";
import {
  computeOffspring,
  gametesOf,
  phenotypeLabels,
  phenotypeShorthand,
} from "./logic/computeOffspring";
import { getCardSequence } from "./content";
import {
  applyAndPersist,
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  selectCardsForMode,
  useGameMode,
} from "@/lib/core";

const GAME_ID = "genetics-punnett";
const REVEAL_THRESHOLD = 5;
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

const MIN_RATIO = 0;
const MAX_RATIO = 16;

export default function GeneticsPunnettGame() {
  const mode = useGameMode();
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [ratio, setRatio] = useState<number[]>([]);
  const [wrongCount, setWrongCount] = useState(0);

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

  // 카드 변경 시 입력 초기화
  useEffect(() => {
    if (!card) return;
    const n = 1 << card.problem.traits.length;
    setRatio(new Array(n).fill(0));
    setWrongCount(0);
    setPhase("playing");
  }, [cardIndex, card]);

  // 부모 gametes + 자손 격자 + 카테고리 라벨 — 카드 변경 시 재계산
  const computed = useMemo(() => {
    if (!card) return null;
    const { p1, p2, traits } = card.problem;
    const top = gametesOf(p1, traits);
    const left = gametesOf(p2, traits);
    const grid = computeOffspring(p1, p2, traits);
    const labels = phenotypeLabels(traits);
    const shorthand = phenotypeShorthand(traits);
    return { top, left, grid, labels, shorthand };
  }, [card]);

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

  if (!card || !computed) return null;

  function bumpRatio(index: number, delta: number) {
    if (phase !== "playing") return;
    setRatio((prev) => {
      const next = [...prev];
      const cur = next[index] ?? 0;
      const v = Math.max(MIN_RATIO, Math.min(MAX_RATIO, cur + delta));
      if (v === cur) return prev;
      next[index] = v;
      void logEvent({
        gameId: GAME_ID,
        cardId: card!.id,
        action: "transform",
        payload: { index, value: v },
      });
      return next;
    });
  }

  function handleCheck() {
    if (phase !== "playing") return;
    setPhase("checking");
    const correct = checkRatio(ratio, card!.problem.expectedRatio);

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { correct, ratio, expected: card!.problem.expectedRatio },
    });

    setTimeout(() => {
      if (correct) {
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
          setRatio([...card!.problem.expectedRatio]);
          setPhase("reveal");
          return;
        }
        setPhase("wrong");
        setTimeout(() => setPhase("playing"), 1100);
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
            자손의 표현형 비율을 맞춰주세요
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

          {/* 부모 유전자형 */}
          <div className="mt-3 flex items-center justify-center gap-2 text-xl tabular text-type-primary sm:mt-6 sm:gap-3 sm:text-display">
            <span className="rounded-block border border-border-hairline bg-bg-block px-3 py-2">
              {card.problem.p1}
            </span>
            <span aria-hidden="true" className="text-type-secondary">
              ×
            </span>
            <span className="rounded-block border border-border-hairline bg-bg-block px-3 py-2">
              {card.problem.p2}
            </span>
          </div>

          {/* 자손 격자 */}
          <motion.div
            className="mt-3 flex justify-center sm:mt-6"
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
            <PunnettGrid
              topGametes={computed.top}
              leftGametes={computed.left}
              grid={computed.grid}
              colored={isResolved}
            />
          </motion.div>

          {/* 표현형 비율 입력 */}
          <ul className="mt-3 flex flex-col gap-2 sm:mt-6">
            {computed.labels.map((label, i) => (
              <RatioInput
                key={i}
                index={i}
                label={label}
                shorthand={computed.shorthand[i] ?? ""}
                value={ratio[i] ?? 0}
                correct={isResolved}
                disabled={phase !== "playing"}
                onInc={() => bumpRatio(i, +1)}
                onDec={() => bumpRatio(i, -1)}
              />
            ))}
          </ul>

          <p
            className="mt-3 text-center text-helper text-type-secondary"
            aria-hidden="true"
          >
            {phase === "wrong"
              ? "비율이 맞지 않아요. 격자를 다시 세어보세요."
              : phase === "correct"
                ? "표현형 비율이 맞아요"
                : "자손 격자를 보고 각 표현형의 비율을 입력하세요"}
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
            disabled={phase !== "playing" || ratio.every((n) => n === 0)}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            정답 확인
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" &&
            "자손 격자를 보고 각 표현형의 비율을 입력하세요"}
          {phase === "wrong" && "비율이 맞지 않아요. 격자를 다시 세어보세요."}
          {phase === "correct" && "표현형 비율이 맞아요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 비율을 보여줄게요."}
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
          {totalCards}개 펀넷 사각형, 비율을 맞췄어요.
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
