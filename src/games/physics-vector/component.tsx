"use client";

// 물리 벡터 합성 — 두 벡터 표시, 학생이 합벡터 (rx, ry) 를 +/- 로 조정.
// 합벡터 시작점은 원점 고정. 평행사변형 보조선이 학생 합벡터 기준 자동 표시.

import { useEffect, useState } from "react";
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
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "physics-vector";
const REVEAL_THRESHOLD = 5;
type Phase =
  | "playing"
  | "checking"
  | "correct"
  | "wrong"
  | "reveal"
  | "completed";

const X_MIN = -5;
const X_MAX = 6;
const Y_MIN = -3;
const Y_MAX = 5;
const VIEWBOX = { width: 264, height: 192 };

function projectX(x: number): number {
  return ((x - X_MIN) / (X_MAX - X_MIN)) * VIEWBOX.width;
}
function projectY(y: number): number {
  return VIEWBOX.height - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * VIEWBOX.height;
}

export default function PhysicsVectorGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [rx, setRx] = useState(1);
  const [ry, setRy] = useState(0);
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
    setRx(1);
    setRy(0);
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

  const [targetRx, targetRy] = card.problem.resultant.components;

  function bump(setter: (v: number) => void, current: number, delta: number, axis: string) {
    if (phase !== "playing") return;
    const next = Math.max(X_MIN, Math.min(X_MAX, current + delta));
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
    const correct = rx === targetRx && ry === targetRy;
    void logEvent({
      gameId: GAME_ID,
      cardId: card!.id,
      action: "submit",
      payload: { correct, rx, ry, target: [targetRx, targetRy] },
    });

    setTimeout(() => {
      if (correct) {
        applyAndPersist("default", GAME_ID, card!.id, {
          correct: true,
          wrongCount,
          hintUsed: false,
        });
        setPhase("correct");
      } else {
        const nextWrong = wrongCount + 1;
        setWrongCount(nextWrong);
        if (nextWrong >= REVEAL_THRESHOLD) {
          applyAndPersist("default", GAME_ID, card!.id, {
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
          setRx(targetRx);
          setRy(targetRy);
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
          <p className="mt-3 text-helper text-type-secondary sm:mt-6 lg:mt-0">{card.unit}</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight text-type-primary sm:mt-2 sm:text-display">{card.problem.context}</h1>
          {card.hint && (
            <p className="mt-1 text-helper text-type-secondary">힌트 · {card.hint}</p>
          )}
          {phase === "reveal" && (
            <div className="mt-3">
              <RevealBanner attemptCount={wrongCount} />
            </div>
          )}

          <motion.div
        className="mx-auto mt-2 sm:mt-4"
        animate={phase === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.36 }}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="w-full max-w-[400px] rounded-block border border-border-hairline bg-bg-block"
          aria-label="벡터 합성 좌표평면"
        >
          <defs>
            <marker
              id="arrow-input"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={6}
              markerHeight={6}
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-type-secondary" />
            </marker>
            <marker
              id="arrow-student"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-type-primary" />
            </marker>
            <marker
              id="arrow-correct"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-accent-positive" />
            </marker>
          </defs>

          {/* 격자 */}
          {Array.from(
            { length: X_MAX - X_MIN + 1 },
            (_, i) => i + X_MIN,
          ).map((v) => (
            <line
              key={`gx-${v}`}
              x1={projectX(v)}
              y1={projectY(Y_MIN)}
              x2={projectX(v)}
              y2={projectY(Y_MAX)}
              className="stroke-border-hairline"
              strokeWidth={v === 0 ? 1 : 0.4}
              opacity={v === 0 ? 0.8 : 0.3}
            />
          ))}
          {Array.from(
            { length: Y_MAX - Y_MIN + 1 },
            (_, i) => i + Y_MIN,
          ).map((v) => (
            <line
              key={`gy-${v}`}
              x1={projectX(X_MIN)}
              y1={projectY(v)}
              x2={projectX(X_MAX)}
              y2={projectY(v)}
              className="stroke-border-hairline"
              strokeWidth={v === 0 ? 1 : 0.4}
              opacity={v === 0 ? 0.8 : 0.3}
            />
          ))}

          {/* 입력 벡터들 */}
          {card.problem.vectors.map((v, i) => (
            <g key={`v-${i}`}>
              <line
                x1={projectX(v.origin[0])}
                y1={projectY(v.origin[1])}
                x2={projectX(v.origin[0] + v.components[0])}
                y2={projectY(v.origin[1] + v.components[1])}
                className="stroke-type-secondary"
                strokeWidth={1.5}
                markerEnd="url(#arrow-input)"
              />
              <text
                x={projectX(v.origin[0] + v.components[0]) + 4}
                y={projectY(v.origin[1] + v.components[1]) - 4}
                className="fill-type-secondary text-[10px]"
              >
                {v.label}
              </text>
            </g>
          ))}

          {/* 평행사변형 보조선 (학생 합벡터 기준) — 두 입력 벡터의 끝점에서 합벡터 끝점까지 점선 */}
          {card.problem.vectors.length === 2 &&
            card.problem.vectors.map((v, i) => (
              <line
                key={`para-${i}`}
                x1={projectX(v.components[0])}
                y1={projectY(v.components[1])}
                x2={projectX(rx)}
                y2={projectY(ry)}
                className="stroke-type-secondary"
                strokeWidth={0.8}
                strokeDasharray="3 3"
                opacity={isResolved ? 0 : 0.4}
              />
            ))}

          {/* 정답 윤곽 — playing 중엔 hide. 입력 벡터 라벨 보고 합 계산 후 "정답 확인".
              plan I6 (Phase 3.2) — 답지 hidden + 가설 수립 + 검증 흐름. */}
          {(phase === "checking" || phase === "wrong") && (
            <line
              x1={projectX(0)}
              y1={projectY(0)}
              x2={projectX(targetRx)}
              y2={projectY(targetRy)}
              className="stroke-type-secondary"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.35}
            />
          )}

          {/* 학생 합벡터 */}
          <line
            x1={projectX(0)}
            y1={projectY(0)}
            x2={projectX(rx)}
            y2={projectY(ry)}
            className={
              isResolved ? "stroke-accent-positive" : "stroke-type-primary"
            }
            strokeWidth={2.5}
            markerEnd={
              isResolved ? "url(#arrow-correct)" : "url(#arrow-student)"
            }
          />
          <text
            x={projectX(rx) + 6}
            y={projectY(ry) - 6}
            className={
              isResolved
                ? "fill-accent-positive text-[11px] font-bold"
                : "fill-type-primary text-[11px] font-bold"
            }
          >
            R
          </text>
        </svg>
      </motion.div>

      <p className="mt-2 text-center text-label tabular text-type-primary">
        합벡터 R = ({rx}, {ry})
      </p>

      {/* 컨트롤 */}
      <div className="mt-2 flex flex-col gap-1.5 sm:mt-3 sm:gap-2">
        <Slider
          label="rx (가로 성분)"
          value={rx}
          onDec={() => bump(setRx, rx, -1, "rx")}
          onInc={() => bump(setRx, rx, +1, "rx")}
          disabled={phase !== "playing"}
        />
        <Slider
          label="ry (세로 성분)"
          value={ry}
          onDec={() => bump(setRy, ry, -1, "ry")}
          onInc={() => bump(setRy, ry, +1, "ry")}
          disabled={phase !== "playing"}
        />
      </div>

      {wrongCount > 0 && phase !== "correct" && (
        <p className="mt-2 text-center text-helper tabular text-type-secondary">
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
            disabled={phase !== "playing"}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10 disabled:opacity-50"
          >
            확인
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {phase === "playing" && `합벡터 R = ${rx}, ${ry}`}
          {phase === "wrong" && "합벡터가 일치하지 않아요"}
          {phase === "correct" && "합벡터가 정답과 일치했어요"}
          {phase === "reveal" && "여러 번 시도했어요. 정답 합벡터를 보여줄게요."}
        </span>
      }
    />
    </>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled: boolean;
}

function Slider({ label, value, onDec, onInc, disabled }: SliderProps) {
  return (
    <div className="flex items-center justify-between rounded-block border border-border-hairline bg-bg-block px-3 py-2">
      <span className="text-helper text-type-secondary">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDec}
          disabled={disabled}
          aria-label={`${label} 감소`}
          className="px-2 text-body text-type-secondary hover:text-type-primary disabled:opacity-30"
        >
          −
        </button>
        <span className="tabular w-10 text-center text-body font-bold text-type-primary">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={disabled}
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
          {totalCards}개 합력, 평행사변형이 보였어요.
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
