"use client";

// 다항식의 항 1개를 블록으로 렌더 + 자유 방향 드래그.
// SPEC §08.5 dragging shadow, §08.6 spring motion.
// 공통인수 part 는 jade 하이라이트 (§08.1 — bg only, 글자색은 그대로).
//
// 변경 (audit BUG-2): drag="y" + bottom=0 constraints 로 위쪽 spring-back 만
// 가능했던 제한 드래그를 자유 방향 드래그로 변경. release 시 block 의
// boundingClientRect 를 부모 handleDragEnd 에 전달해서 dropZone 와 hit-test.

import { useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import type { Term } from "../logic/types";

interface TermBlockProps {
  term: Term;
  draggable: boolean;
  /** drag 중 PanInfo 전달 — 부모가 dropZone hover state 또는 시각 피드백에 사용. */
  onDragMove: (info: PanInfo) => void;
  /** 드래그 종료 시 PanInfo + block 의 viewport rect 전달. 부모가 hit-test. */
  onDragEnd: (info: PanInfo, blockRect: DOMRect) => void;
}

export function TermBlock({
  term,
  draggable,
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
