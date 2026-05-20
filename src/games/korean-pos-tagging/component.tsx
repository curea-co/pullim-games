"use client";

// 한국어 품사 태깅 — 토큰별 품사 색 toggling → "정답 확인" → token-by-token 비교.
// 답지 노출 X (wrong 시 정확도만, 토큰별 오답 강조 X — 학생 전체 재검토 강제).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { CorrectBurst } from "@/components/ui/CorrectBurst";
import { RevealBanner } from "@/components/ui/RevealBanner";
import { SentenceTokens } from "./components/SentenceTokens";
import { PalettePicker } from "./components/PalettePicker";
import { checkTagging } from "./logic/checkTagging";
import { POS_VALUES, type KoreanPos } from "./schema";
import { getCardSequence } from "./content";
import {
  applyAndPersist,
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  selectCardsForMode,
  useGameMode,
} from "@/lib/core";

const GAME_ID = "korean-pos-tagging";
const REVEAL_THRESHOLD = 5;
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

export default function KoreanPosTaggingGame() {
  const mode = useGameMode(GAME_ID);
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [tagging, setTagging] = useState<(KoreanPos | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
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
    setTagging(new Array(card.problem.tokens.length).fill(null));
    setActiveIndex(0);
    setWrongCount(0);
    setAccuracy(null);
    setPhase("playing");
  }, [cardIndex, card]);

  const allTagged = useMemo(
    () => tagging.length > 0 && tagging.every((t) => t !== null),
    [tagging],
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

  function pickPos(pos: KoreanPos) {
    if (phase !== "playing") return;
    const current = activeIndex;
    if (current === null) return;
    setTagging((prev) => {
      const next = [...prev];
      next[current] = pos;
      return next;
    });
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { index: current, pos },
    });
    // 다음 미태깅 토큰으로 자동 이동 (없으면 active 유지)
    const tokens = card!.problem.tokens;
    let nextActive: number = (current + 1) % tokens.length;
    for (let i = 1; i <= tokens.length; i++) {
      const candidate: number = (current + i) % tokens.length;
      if (candidate === current) continue;
      if (tagging[candidate] === null) {
        nextActive = candidate;
        break;
      }
    }
    setActiveIndex(nextActive);
  }

  function selectToken(index: number) {
    if (phase !== "playing") return;
    setActiveIndex(index);
  }

  function handleCheck() {
    if (phase !== "playing" || !allTagged) return;
    setPhase("checking");
    const result = checkTagging(tagging, card!.problem.tokens);
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
          setTagging(card!.problem.tokens.map((t) => t.pos));
          setActiveIndex(null);
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
            각 어절의 품사를 칠해주세요
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

          {/* 문장 토큰 */}
          <motion.div
            className="mt-8 flex justify-center"
            animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.36 }}
          >
            <SentenceTokens
              tokens={card.problem.tokens}
              tagging={tagging}
              activeIndex={activeIndex}
              disabled={phase !== "playing"}
              onSelect={selectToken}
            />
          </motion.div>

          {/* 팔레트 */}
          <div className="mt-8">
            <PalettePicker
              options={POS_VALUES}
              disabled={phase !== "playing"}
              onPick={pickPos}
            />
          </div>

          <p
            className="mt-4 text-center text-helper text-type-secondary"
            aria-hidden="true"
          >
            {phase === "wrong" && accuracy
              ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
              : phase === "correct"
                ? "모든 어절이 정답이에요"
                : activeIndex !== null
                  ? `${activeIndex + 1}번 토큰을 선택했어요 — 품사를 골라주세요`
                  : "어절을 탭한 뒤 품사를 골라주세요"}
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
            disabled={phase !== "playing" || !allTagged}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            정답 확인
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" && "어절을 탭한 뒤 품사를 골라주세요"}
          {phase === "wrong" && accuracy
            ? `${accuracy.correct}/${accuracy.total} 맞췄어요. 다시 살펴보세요.`
            : ""}
          {phase === "correct" && "모든 어절이 정답이에요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 품사를 보여줄게요."}
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
          {totalCards}문장, 품사를 모두 칠했어요.
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
