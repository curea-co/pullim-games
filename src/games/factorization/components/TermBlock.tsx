"use client";

// 다항식의 항 1개를 블록으로 렌더 + Y축 드래그 가능.
// SPEC §08.5 dragging shadow, §08.6 spring motion.
// 공통인수 part 는 jade 하이라이트 (§08.1 — bg only, 글자색은 그대로).

import { motion, type PanInfo } from "framer-motion";
import type { Term } from "../logic/types";

interface TermBlockProps {
  term: Term;
  draggable: boolean;
  /** Y 음수 = 위로 끔 (드롭 존 방향). 이 값이 양수일 때 드래그 진행 신호로 사용. */
  onDragMove: (offsetY: number) => void;
  /** 드래그 종료 시 — onDragMove 의 offsetY 가 임계 이하면 자동 spring back. */
  onDragEnd: (info: PanInfo) => void;
}

export function TermBlock({
  term,
  draggable,
  onDragMove,
  onDragEnd,
}: TermBlockProps) {
  return (
    <motion.div
      layout
      className="touch-none cursor-grab select-none rounded-block border border-border-hairline bg-bg-block px-5 py-3.5 active:cursor-grabbing"
      drag={draggable ? "y" : false}
      dragConstraints={{ top: -160, bottom: 0 }}
      dragElastic={0.25}
      dragSnapToOrigin
      whileHover={draggable ? { scale: 1.02 } : undefined}
      whileDrag={{
        scale: 1.05,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
      onDrag={(_, info) => onDragMove(info.offset.y)}
      onDragEnd={(_, info) => onDragEnd(info)}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      <span className="inline-flex items-baseline gap-0.5 text-display tabular text-type-primary">
        {term.parts.map((part) => (
          <span
            key={part.id}
            className={
              part.isCommon
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
