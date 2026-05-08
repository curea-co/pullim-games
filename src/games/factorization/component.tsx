"use client";

// 인수분해 블록 분리 — V0.1: Card 1 단일 카드 vertical slice.
// 사용자가 다항식 블록을 가로로 50px 이상 끌면 → 변형 트리거 → factored form 으로 morph.
// V0.2: 카드 5장 시퀀스, FSRS 통합, 이벤트 로깅, AST 일반 변환.

import { Fragment, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getNextCard } from "./content";

type Phase = "before" | "transforming" | "after";

const DRAG_THRESHOLD_PX = 50;

export default function FactorizationGame() {
  const [card] = useState(() => getNextCard());
  const [phase, setPhase] = useState<Phase>("before");

  const triggerExtract = () => {
    if (phase !== "before") return;
    setPhase("transforming");
    // 220ms spring 변형 후 "after" 상태로 — SPEC §08.6 motion 토큰
    setTimeout(() => setPhase("after"), 240);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 py-8">
      {/* 상단: 진행도 + 종료 (SPEC §04.1) */}
      <header className="flex items-center justify-between text-label tabular text-type-secondary">
        <span>1 / 1</span>
        <Link
          href="/"
          aria-label="메인으로"
          className="rounded-button px-2 py-1 hover:text-type-primary"
        >
          ≡
        </Link>
      </header>

      {/* 캡션 */}
      <p className="mt-6 text-body text-type-secondary">{card.hint}</p>

      {/* 메인 영역 */}
      <section className="mt-12 flex flex-1 flex-col items-center justify-center gap-10">
        <AnimatePresence mode="wait">
          {phase !== "after" ? (
            <BeforeBlocks
              key="before"
              polynomial={card.problem.polynomial}
              transforming={phase === "transforming"}
              onExtract={triggerExtract}
            />
          ) : (
            <AfterDisplay
              key="after"
              factoredForm={card.problem.factoredForm}
            />
          )}
        </AnimatePresence>

        {/* 인터랙션 힌트 — phase에 따라 변경 */}
        <p
          className="text-helper text-type-secondary transition-opacity"
          aria-live="polite"
        >
          {phase === "before" && "블록을 옆으로 끌어 보세요"}
          {phase === "transforming" && " "}
          {phase === "after" && "공통인수를 끌어냈어요"}
        </p>
      </section>

      {/* 액션: "다음 →" — 정답 후만 활성 */}
      <footer className="mt-8">
        {phase === "after" ? (
          <Link
            href="/"
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10"
          >
            다음 →
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full rounded-button border border-border-hairline px-4 py-3 text-body text-type-secondary opacity-50"
          >
            다음 →
          </button>
        )}
      </footer>
    </main>
  );
}

/**
 * 변형 전: 다항식이 블록들로 표시. 각 블록을 가로로 끌 수 있음.
 * "2x + 4" → ["2x", "4"] 두 블록.
 */
function BeforeBlocks({
  polynomial,
  transforming,
  onExtract,
}: {
  polynomial: string;
  transforming: boolean;
  onExtract: () => void;
}) {
  // V0.1 단순 split — `+` 만 처리. V0.2에서 AST 파서로 대체.
  const parts = polynomial.split(/\s*\+\s*/).map((p) => p.trim());

  return (
    <motion.div
      className="flex items-center gap-3 text-display tabular text-type-primary"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      {parts.map((part, idx) => (
        <Fragment key={`${part}-${idx}`}>
          {idx > 0 && (
            <span aria-hidden="true" className="text-type-secondary">
              +
            </span>
          )}
          <DraggableBlock onExtract={onExtract} transforming={transforming}>
            {part}
          </DraggableBlock>
        </Fragment>
      ))}
    </motion.div>
  );
}

/** 가로 드래그 가능한 다항식 블록. 50px 이상 이동 시 onExtract 호출. */
function DraggableBlock({
  children,
  onExtract,
  transforming,
}: {
  children: React.ReactNode;
  onExtract: () => void;
  transforming: boolean;
}) {
  return (
    <motion.div
      className="touch-none cursor-grab select-none rounded-block border border-border-hairline bg-bg-block px-6 py-4 active:cursor-grabbing"
      drag={transforming ? false : "x"}
      dragConstraints={{ left: -80, right: 80 }}
      dragElastic={0.3}
      dragSnapToOrigin
      whileHover={{ scale: 1.02 }}
      whileDrag={{
        scale: 1.05,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > DRAG_THRESHOLD_PX) {
          onExtract();
        }
      }}
      animate={
        transforming
          ? {
              scale: 0.9,
              opacity: 0.4,
              boxShadow: "0 0 24px rgba(0,212,161,0.4)",
            }
          : { scale: 1, opacity: 1 }
      }
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

/** 변형 후: factored form 표시 + jade glow → fade. */
function AfterDisplay({ factoredForm }: { factoredForm: string }) {
  return (
    <motion.div
      className="rounded-block border border-border-hairline bg-bg-block px-8 py-5 text-display tabular text-type-primary"
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
      {factoredForm}
    </motion.div>
  );
}
