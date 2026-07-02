"use client";

// 공통인수 chip rack — drag-to-chip 메커닉의 drop target 3 개.
// plan 2026-05-14_factorization-discrimination §1·§2 D1: dropZone 자리를
// chip rack 으로 대체. 학생이 term block 을 chip 위로 드래그 → 떨어진 chip
// 이 정답 chip 이면 success.
//
// hit-test 는 부모 component 가 각 chip 의 boundingClientRect 를 직접 검사.
// 본 컴포넌트는 chip 의 ref 를 외부에 expose 하기 위해 onChipMount callback 제공.
//
// hit area 보장 (plan §6 위험 4): chip min-w 80px + min-h 56px. 모바일 작은
// 화면에서도 부담 없이 드롭 가능 (image-hotspot UX-3 교훈).

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { palette } from "@/lib/design-tokens";

export interface FactorChipRackProps {
  /** 후보 chip 텍스트 3개 (1 정답 + 2 distractors, 부모가 shuffle 해서 전달). */
  candidates: string[];
  /** 현재 드래그 hover 중인 chip 텍스트 — 정답 여부 구별 없이 시각 강조용. */
  hoveringText: string | null;
  /** 직전 wrong chip 텍스트 — 짧은 negative flash 표시 (border red 200ms). */
  wrongFlashText: string | null;
  /** 각 chip 의 boundingClientRect 측정용 ref 등록. 부모가 hit-test 에 사용. */
  onChipMount: (text: string, el: HTMLDivElement | null) => void;
}

export function FactorChipRack({
  candidates,
  hoveringText,
  wrongFlashText,
  onChipMount,
}: FactorChipRackProps) {
  return (
    <div
      role="region"
      aria-label="공통인수 후보"
      className="flex flex-wrap items-center justify-center gap-3"
    >
      {candidates.map((text) => (
        <FactorChip
          key={text}
          text={text}
          isHovering={hoveringText === text}
          isWrongFlash={wrongFlashText === text}
          onMount={(el) => onChipMount(text, el)}
        />
      ))}
    </div>
  );
}

interface ChipProps {
  text: string;
  isHovering: boolean;
  isWrongFlash: boolean;
  onMount: (el: HTMLDivElement | null) => void;
}

function FactorChip({ text, isHovering, isWrongFlash, onMount }: ChipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMount(ref.current);
    return () => onMount(null);
  }, [onMount]);

  return (
    <motion.div
      ref={ref}
      data-chip-text={text}
      className="relative flex min-h-[56px] min-w-[80px] items-center justify-center rounded-block border bg-bg-block px-4 py-3 text-display tabular text-type-primary"
      animate={{
        borderColor: isWrongFlash
          ? palette.negative
          : isHovering
            ? palette.blue
            : palette.line,
        backgroundColor: isHovering
          ? "rgba(3,98,218,0.06)"
          : "rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.14, ease: "easeOut" }}
    >
      <AnimatePresence>
        {isWrongFlash && (
          <motion.span
            key="wrong"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-block ring-2 ring-accent-negative/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>
      <span>{text}</span>
    </motion.div>
  );
}
