"use client";

// 화학 반응식 균형 — 양변 분자 앞 계수 +/- 조작, 모든 원소 균형 시 결합.
// 학생 계수가 정답 계수와 정확히 일치하면 정답 (GCD 정규화 X — 교과서식 최소정수계수).
// 양변 원자 수 실시간 카운터로 학습 보조.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getCardSequence } from "./content";
import { allElements, isBalanced, sumSide } from "./logic/parse";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "chemistry-balance";
type Phase = "playing" | "checking" | "correct" | "wrong" | "completed";

const MIN_COEF = 1;
const MAX_COEF = 9;

export default function ChemistryBalanceGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [reactantCoefs, setReactantCoefs] = useState<number[]>([]);
  const [productCoefs, setProductCoefs] = useState<number[]>([]);
  const [wrongCount, setWrongCount] = useState(0);

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
    setReactantCoefs(card.problem.reactants.map(() => 1));
    setProductCoefs(card.problem.products.map(() => 1));
    setWrongCount(0);
    setPhase("playing");
  }, [cardIndex, card]);

  const elements = useMemo(
    () => (card ? allElements(card.problem.reactants, card.problem.products) : []),
    [card],
  );

  const liveLeft = useMemo(() => {
    if (!card) return {};
    return sumSide(
      card.problem.reactants.map((r, i) => ({
        formula: r.formula,
        coefficient: reactantCoefs[i] ?? 1,
      })),
    );
  }, [card, reactantCoefs]);

  const liveRight = useMemo(() => {
    if (!card) return {};
    return sumSide(
      card.problem.products.map((p, i) => ({
        formula: p.formula,
        coefficient: productCoefs[i] ?? 1,
      })),
    );
  }, [card, productCoefs]);

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

  function bumpCoef(side: "r" | "p", index: number, delta: number) {
    if (phase !== "playing") return;
    const setter = side === "r" ? setReactantCoefs : setProductCoefs;
    const list = side === "r" ? reactantCoefs : productCoefs;
    const next = [...list];
    const cur = next[index] ?? 1;
    const v = Math.max(MIN_COEF, Math.min(MAX_COEF, cur + delta));
    if (v === cur) return;
    next[index] = v;
    setter(next);
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { side, index, value: v },
    });
  }

  function handleCheck() {
    if (phase !== "playing") return;
    setPhase("checking");
    const correctReactants = card!.problem.reactants.every(
      (r, i) => reactantCoefs[i] === r.coefficient,
    );
    const correctProducts = card!.problem.products.every(
      (p, i) => productCoefs[i] === p.coefficient,
    );
    const balanced = isBalanced(
      card!.problem.reactants.map((r, i) => ({
        formula: r.formula,
        coefficient: reactantCoefs[i] ?? 1,
      })),
      card!.problem.products.map((p, i) => ({
        formula: p.formula,
        coefficient: productCoefs[i] ?? 1,
      })),
    );
    const correct = balanced && correctReactants && correctProducts;

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { correct, balanced, reactantCoefs, productCoefs },
    });

    setTimeout(() => {
      if (correct) {
        const rating = wrongCount === 0 ? "good" : wrongCount <= 1 ? "hard" : "again";
        const prev = loadSrsState(GAME_ID, card!.id);
        const updated = reviewCard(prev, rating);
        saveSrsState(GAME_ID, card!.id, updated);
        setPhase("correct");
      } else {
        setWrongCount((w) => w + 1);
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

  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-6 py-6">
      <header className="flex items-center justify-between text-label tabular text-type-secondary">
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
      </header>

      <p className="mt-6 text-helper text-type-secondary">{card.unit}</p>
      <h1 className="mt-2 text-display text-type-primary">반응식의 균형을 맞춰주세요</h1>
      {card.hint && (
        <p className="mt-1 text-helper text-type-secondary">힌트 · {card.hint}</p>
      )}

      {/* 원자 카운터 */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-block border border-border-hairline bg-bg-block p-3">
          <p className="text-helper text-type-secondary">왼쪽 원자 수</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-label tabular text-type-primary">
            {elements.map((el) => {
              const l = liveLeft[el] ?? 0;
              const r = liveRight[el] ?? 0;
              const ok = l === r && l > 0;
              return (
                <li key={el} className={ok ? "text-accent-positive" : ""}>
                  {el}:{l}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-block border border-border-hairline bg-bg-block p-3">
          <p className="text-helper text-type-secondary">오른쪽 원자 수</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-label tabular text-type-primary">
            {elements.map((el) => {
              const l = liveLeft[el] ?? 0;
              const r = liveRight[el] ?? 0;
              const ok = l === r && r > 0;
              return (
                <li key={el} className={ok ? "text-accent-positive" : ""}>
                  {el}:{r}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 반응식 */}
      <motion.section
        className="mt-6 flex flex-1 flex-col items-center justify-center gap-3"
        animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.36 }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {card.problem.reactants.map((r, i) => (
            <CoefAtom
              key={`r-${i}`}
              formula={r.formula}
              value={reactantCoefs[i] ?? 1}
              correct={phase === "correct"}
              onInc={() => bumpCoef("r", i, +1)}
              onDec={() => bumpCoef("r", i, -1)}
              showPlus={i < card.problem.reactants.length - 1}
            />
          ))}
          <span className="px-1 text-display text-type-primary">→</span>
          {card.problem.products.map((p, i) => (
            <CoefAtom
              key={`p-${i}`}
              formula={p.formula}
              value={productCoefs[i] ?? 1}
              correct={phase === "correct"}
              onInc={() => bumpCoef("p", i, +1)}
              onDec={() => bumpCoef("p", i, -1)}
              showPlus={i < card.problem.products.length - 1}
            />
          ))}
        </div>
        {wrongCount > 0 && phase !== "correct" && (
          <p className="text-helper tabular text-type-secondary">
            오답 {wrongCount}회
          </p>
        )}
      </motion.section>

      <footer className="mt-6">
        {phase === "correct" ? (
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
            disabled={phase !== "playing"}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            균형 확인
          </button>
        )}
      </footer>

      <span className="sr-only" aria-live="polite">
        {phase === "playing" && "계수를 조정해 양변 원자 수를 맞춰주세요"}
        {phase === "wrong" && "균형이 맞지 않아요. 다시 해보세요."}
        {phase === "correct" && "반응식이 균형됐어요"}
      </span>
    </main>
  );
}

interface CoefAtomProps {
  formula: string;
  value: number;
  correct: boolean;
  onInc: () => void;
  onDec: () => void;
  showPlus: boolean;
}

function CoefAtom({
  formula,
  value,
  correct,
  onInc,
  onDec,
  showPlus,
}: CoefAtomProps) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`flex items-center rounded-block border ${
          correct
            ? "border-accent-positive bg-accent-positive/10"
            : "border-border-hairline bg-bg-block"
        }`}
      >
        <button
          type="button"
          onClick={onDec}
          aria-label={`${formula} 계수 감소`}
          className="px-2 py-2 text-body text-type-secondary hover:text-type-primary"
        >
          −
        </button>
        <span className="tabular px-1 text-body font-bold text-type-primary">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          aria-label={`${formula} 계수 증가`}
          className="px-2 py-2 text-body text-type-secondary hover:text-type-primary"
        >
          +
        </button>
      </span>
      <span className="text-display tabular text-type-primary">{formula}</span>
      {showPlus && <span className="px-1 text-body text-type-secondary">+</span>}
    </span>
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
          {totalCards}개 반응식, 균형이 잡혔어요.
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
