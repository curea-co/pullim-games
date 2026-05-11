"use client";

// 함수 그래프 변형 — y = a(x-h)^2 + k 의 a, h, k 를 학생이 +/- 로 조정.
// 학생 곡선이 목표 곡선 윤곽과 일치하면 정답.
// SVG 좌표평면: x ∈ [-5, 5], y ∈ [-3, 9].

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getCardSequence } from "./content";
import {
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  reviewCard,
  saveSrsState,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "math-graph-shift";
type Phase = "playing" | "checking" | "correct" | "wrong" | "completed";

const X_MIN = -5;
const X_MAX = 5;
const Y_MIN = -3;
const Y_MAX = 9;
const VIEWBOX = { width: 240, height: 240 };

const A_MIN = -2;
const A_MAX = 2;
const HK_MIN = -3;
const HK_MAX = 4;

function projectX(x: number): number {
  return ((x - X_MIN) / (X_MAX - X_MIN)) * VIEWBOX.width;
}
function projectY(y: number): number {
  return VIEWBOX.height - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * VIEWBOX.height;
}

function curvePath(a: number, h: number, k: number): string {
  const points: string[] = [];
  for (let x = X_MIN; x <= X_MAX; x += 0.1) {
    const y = a * (x - h) * (x - h) + k;
    if (y < Y_MIN - 1 || y > Y_MAX + 1) continue;
    const px = projectX(x).toFixed(1);
    const py = projectY(y).toFixed(1);
    points.push(`${points.length === 0 ? "M" : "L"} ${px} ${py}`);
  }
  return points.join(" ");
}

export default function MathGraphShiftGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [a, setA] = useState(1);
  const [h, setH] = useState(0);
  const [k, setK] = useState(0);
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
    setA(1);
    setH(0);
    setK(0);
    setWrongCount(0);
    setPhase("playing");
  }, [cardIndex]);

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

  function bump(setter: (v: number) => void, current: number, delta: number, min: number, max: number, axis: string) {
    if (phase !== "playing") return;
    const next = Math.max(min, Math.min(max, current + delta));
    if (next === current) return;
    setter(next);
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "transform",
      payload: { axis, value: next },
    });
  }

  function handleCheck() {
    if (phase !== "playing") return;
    setPhase("checking");
    const correct =
      a === card!.problem.targetA &&
      h === card!.problem.targetH &&
      k === card!.problem.targetK;

    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { correct, a, h, k, target: { a: card!.problem.targetA, h: card!.problem.targetH, k: card!.problem.targetK } },
    });

    setTimeout(() => {
      if (correct) {
        const rating = wrongCount === 0 ? "good" : wrongCount === 1 ? "hard" : "again";
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

  const studentPath = curvePath(a, h, k);
  const targetPath = curvePath(
    card.problem.targetA,
    card.problem.targetH,
    card.problem.targetK,
  );

  // 현재 식 텍스트
  const aStr = a === 1 ? "" : a === -1 ? "-" : `${a}`;
  const hStr = h === 0 ? "x" : h > 0 ? `(x - ${h})` : `(x + ${-h})`;
  const kStr = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
  const currentEq = `y = ${aStr}${hStr}²${kStr}`;

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
      <h1 className="mt-2 text-display text-type-primary">
        {card.problem.startEquation} → {card.problem.targetEquation}
      </h1>
      {card.hint && (
        <p className="mt-1 text-helper text-type-secondary">힌트 · {card.hint}</p>
      )}

      {/* SVG 좌표평면 */}
      <motion.section
        className="mx-auto mt-6"
        animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.36 }}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="h-60 w-60 rounded-block border border-border-hairline bg-bg-block"
          aria-label="좌표평면 그래프"
        >
          {/* 축 */}
          <line
            x1={projectX(X_MIN)}
            y1={projectY(0)}
            x2={projectX(X_MAX)}
            y2={projectY(0)}
            className="stroke-border-hairline"
            strokeWidth={1}
          />
          <line
            x1={projectX(0)}
            y1={projectY(Y_MIN)}
            x2={projectX(0)}
            y2={projectY(Y_MAX)}
            className="stroke-border-hairline"
            strokeWidth={1}
          />
          {/* 격자 (정수 단위) */}
          {Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => i + X_MIN)
            .filter((v) => v !== 0)
            .map((v) => (
              <line
                key={`gx-${v}`}
                x1={projectX(v)}
                y1={projectY(Y_MIN)}
                x2={projectX(v)}
                y2={projectY(Y_MAX)}
                className="stroke-border-hairline opacity-30"
                strokeWidth={0.5}
              />
            ))}
          {/* 목표 곡선 (점선) */}
          <path
            d={targetPath}
            fill="none"
            className="stroke-type-secondary"
            strokeWidth={2}
            strokeDasharray="4 4"
            opacity={phase === "correct" ? 0 : 0.7}
          />
          {/* 학생 곡선 */}
          <path
            d={studentPath}
            fill="none"
            className={
              phase === "correct"
                ? "stroke-accent-positive"
                : "stroke-type-primary"
            }
            strokeWidth={2.5}
          />
        </svg>
      </motion.section>

      <p className="mt-3 text-center text-label tabular text-type-primary">
        지금: <span className="font-bold">{currentEq}</span>
      </p>

      {/* 컨트롤 */}
      <section className="mt-4 flex flex-col gap-2">
        <Slider
          label="a (계수)"
          value={a}
          min={A_MIN}
          max={A_MAX}
          onDec={() => bump(setA, a, -1, A_MIN, A_MAX, "a")}
          onInc={() => bump(setA, a, +1, A_MIN, A_MAX, "a")}
          disabled={phase !== "playing"}
        />
        <Slider
          label="h (가로)"
          value={h}
          min={HK_MIN}
          max={HK_MAX}
          onDec={() => bump(setH, h, -1, HK_MIN, HK_MAX, "h")}
          onInc={() => bump(setH, h, +1, HK_MIN, HK_MAX, "h")}
          disabled={phase !== "playing"}
        />
        <Slider
          label="k (세로)"
          value={k}
          min={HK_MIN}
          max={HK_MAX}
          onDec={() => bump(setK, k, -1, HK_MIN, HK_MAX, "k")}
          onInc={() => bump(setK, k, +1, HK_MIN, HK_MAX, "k")}
          disabled={phase !== "playing"}
        />
      </section>

      {wrongCount > 0 && phase !== "correct" && (
        <p className="mt-2 text-center text-helper tabular text-type-secondary">
          오답 {wrongCount}회
        </p>
      )}

      <footer className="mt-auto pt-4">
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
            확인
          </button>
        )}
      </footer>

      <span className="sr-only" aria-live="polite">
        {phase === "playing" && `현재 식: ${currentEq}`}
        {phase === "wrong" && "그래프가 일치하지 않아요"}
        {phase === "correct" && "정답이에요. 그래프가 일치했어요"}
      </span>
    </main>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onDec: () => void;
  onInc: () => void;
  disabled: boolean;
}

function Slider({ label, value, min, max, onDec, onInc, disabled }: SliderProps) {
  return (
    <div className="flex items-center justify-between rounded-block border border-border-hairline bg-bg-block px-3 py-2">
      <span className="text-helper text-type-secondary">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDec}
          disabled={disabled || value <= min}
          aria-label={`${label} 감소`}
          className="px-2 text-body text-type-secondary hover:text-type-primary disabled:opacity-30"
        >
          −
        </button>
        <span className="tabular w-8 text-center text-body font-bold text-type-primary">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={disabled || value >= max}
          aria-label={`${label} 증가`}
          className="px-2 text-body text-type-secondary hover:text-type-primary disabled:opacity-30"
        >
          +
        </button>
      </span>
    </div>
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
          {totalCards}개 그래프, 식이 손에 잡혔어요.
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
