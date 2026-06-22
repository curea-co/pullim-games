"use client";

// 다항식의 항 1개를 블록으로 렌더 + 자유 방향 드래그.
// SPEC §08.5 dragging shadow, §08.6 spring motion.
//
// 공통인수 part 의 jade 하이라이트 노출은 revealCommon prop 으로 제어.
// plan 2026-05-14_factorization-discrimination §2 D3: 초기엔 노출 X
// (변별력 정책), 정답 chip 선택 후에만 노출.
//
// 변경 이력
// - BUG-2 fix: drag="y" + bottom=0 → 자유 방향. release 시 block 의
//   boundingClientRect 를 부모 handleDragEnd 로 전달해 chip/dropZone hit-test.
// - Phase 2: dropZone hit-test → FactorChipRack hit-test. revealCommon 도입.

import { useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import type { Term } from "../logic/types";

interface TermBlockProps {
  term: Term;
  draggable: boolean;
  /** 공통인수 part 의 jade 하이라이트 노출 여부. 정답 chip 선택 후 true. */
  revealCommon?: boolean;
  /** drag 중 PanInfo 전달 — 부모가 chip hover state 또는 시각 피드백에 사용. */
  onDragMove: (info: PanInfo) => void;
  /** 드래그 종료 시 PanInfo + block 의 viewport rect 전달. 부모가 hit-test. */
  onDragEnd: (info: PanInfo, blockRect: DOMRect) => void;
}

export function TermBlock({
  term,
  draggable,
  revealCommon = false,
  onDragMove,
  onDragEnd,
}: TermBlockProps) {
  // ref 로 motion.div 직접 참조 — event.currentTarget 은 framer-motion 의
  // pointerup 시점에 window 일 수 있어 신뢰 불가.
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      layout
      className="touch-none cursor-grab select-none rounded-block border border-border-hairline bg-bg-block px-5 py-3.5 active:cursor-grabbing"
      drag={draggable}
      dragSnapToOrigin
      dragElastic={0.1}
      whileHover={draggable ? { scale: 1.02 } : undefined}
      whileDrag={{
        scale: 1.05,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 10,
      }}
      onDrag={(_, info) => onDragMove(info)}
      onDragEnd={(_, info) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) onDragEnd(info, rect);
      }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      <span className="inline-flex items-baseline gap-0.5 text-display tabular text-type-primary">
        {term.parts.map((part) => (
          <span
            key={part.id}
            className={
              part.isCommon && revealCommon
                ? "rounded-sm bg-accent-positive/15 px-1 py-0.5"
                : ""
            }
          >
            {part.text}
          </span>
        ))}
      </span>
    </motion.div>
  );
}
