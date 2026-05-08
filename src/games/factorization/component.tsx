"use client";

// 인수분해 블록 분리 — V0.1 재설계.
// SPEC §03 §3.4 인터랙션 + §04 사용자 경험 + §08 디자인 시스템 준수.
//
// 인터랙션 phase:
//   idle       — 정적 표시, 블록을 끌 수 있음
//   dragging   — 사용자가 어떤 블록이든 위로 끌고 있음 (드롭 존 jade 활성, 미리보기 노출)
//   extracting — 임계(50px) 통과한 후 변형 애니메이션 (220ms)
//   done       — factored form 표시, "다음 →" 활성

import { Fragment, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { TermBlock } from "./components/TermBlock";
import { DropZone } from "./components/DropZone";
import { extractCommonFactor, assertAllTermsHaveCommonPart } from "./logic/transform";
import { getNextCard } from "./content";

type Phase = "idle" | "dragging" | "extracting" | "done";

const DRAG_THRESHOLD_PX = 50;

export default function FactorizationGame() {
  const [card] = useState(() => getNextCard());
  // 카드 데이터 검증 — 모든 항이 공통인수 part 보유
  assertAllTermsHaveCommonPart(card.problem.terms);

  const [phase, setPhase] = useState<Phase>("idle");
  // 드래그 중 가장 큰 (위로 끄는 방향) Y 변위. 임계 통과 시 드롭 존 활성.
  const [dragMagnitude, setDragMagnitude] = useState(0);

  const factored = extractCommonFactor(
    card.problem.terms,
    card.problem.commonFactor,
  );

  const handleDragMove = (offsetY: number) => {
    // 위로 끄는 동작 (offsetY 음수)을 양수로 변환해 추적
    const upward = Math.max(0, -offsetY);
    setDragMagnitude(upward);
    if (phase === "idle" && upward > 8) {
      setPhase("dragging");
    } else if (phase === "dragging" && upward < 4) {
      setPhase("idle");
    }
  };

  const handleDragEnd = (_info: PanInfo) => {
    if (dragMagnitude > DRAG_THRESHOLD_PX) {
      setPhase("extracting");
      setTimeout(() => setPhase("done"), 240);
    } else {
      setPhase("idle");
    }
    setDragMagnitude(0);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 py-8">
      {/* 상단: 진행도 + 메뉴 (SPEC §04.1) */}
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
      <section className="mt-10 flex flex-1 flex-col items-center justify-center gap-8">
        {/* 다항식 표현 — 변형 전/후 cross-fade */}
        <AnimatePresence mode="wait">
          {phase !== "done" ? (
            <BeforeView
              key="before"
              terms={card.problem.terms}
              draggable={phase !== "extracting"}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              transforming={phase === "extracting"}
            />
          ) : (
            <AfterView
              key="after"
              factor={factored.factor}
              remainders={factored.remainders}
            />
          )}
        </AnimatePresence>

        {/* 드롭 존 — done 이전 항상 표시, 드래그 중에만 jade 강조 */}
        {phase !== "done" && (
          <DropZone
            active={phase === "dragging"}
            previewText={
              phase === "dragging" ? card.problem.factoredForm : undefined
            }
          />
        )}
      </section>

      {/* 액션 영역 */}
      <footer className="mt-8">
        {phase === "done" ? (
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

      {/* 인터랙션 음성/스크린리더 힌트 */}
      <span className="sr-only" aria-live="polite">
        {phase === "idle" && "블록을 위로 끌어 공통인수를 빼내세요"}
        {phase === "dragging" && "드롭 존이 활성화됐어요. 놓으면 변형됩니다."}
        {phase === "extracting" && "변형 중"}
        {phase === "done" && "공통인수를 끌어냈어요"}
      </span>
    </main>
  );
}

interface BeforeViewProps {
  terms: ReturnType<typeof getNextCard>["problem"]["terms"];
  draggable: boolean;
  onDragMove: (offsetY: number) => void;
  onDragEnd: (info: PanInfo) => void;
  transforming: boolean;
}

/** 변형 전: 항 블록들이 + 로 연결됨. */
function BeforeView({
  terms,
  draggable,
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
          ? {
              opacity: 0.4,
              scale: 0.92,
            }
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
  remainders: ReturnType<typeof getNextCard>["problem"]["terms"];
}

/** 변형 후: factor · ( remainder1 + remainder2 ). 새 블록 구성 + jade glow → fade. */
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
      {/* 추출된 공통인수 */}
      <span className="rounded-sm bg-accent-positive/15 px-1 py-0.5 text-display tabular text-type-primary">
        {factor.text}
      </span>
      {/* 곱셈 표시 */}
      <span aria-hidden="true" className="text-display text-type-secondary">
        ·
      </span>
      {/* 괄호 내부: 남은 항들이 + 로 연결 */}
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
