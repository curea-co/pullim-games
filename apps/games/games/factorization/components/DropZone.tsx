"use client";

// 공통인수 추출 드롭 존 — SPEC §03.5 + §04.1 §04.4.
// 기본: 점선 윤곽 hairline color, 8px radius. 드래그 시작 시 accent 실선으로 강조.
// 변형 미리보기: 드래그 중일 때 결과 형태를 미세하게 표시 (SPEC §03.5).
//
// `proc/plan/2026-05-13_daily-execution.md` 트랙 A — forwardRef 로 부모가
// bounding rect 를 hit-test 에 사용. 영역 밖 drag end 는 wrong 처리.

import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface DropZoneProps {
  /** 드래그 진행 중인지. true 일 때 accent 강조 + 미리보기 표시. */
  active: boolean;
  /** 변형 미리보기 텍스트 — 드래그 중에만 노출. 예: "2(x + 2)" */
  previewText?: string;
}

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(function DropZone(
  { active, previewText },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className="rounded-dropzone px-5 py-3 text-center"
      animate={{
        borderColor: active ? "#0362DA" : "#E5E5E5",
        backgroundColor: active ? "rgba(3,98,218,0.06)" : "rgba(0,0,0,0)",
      }}
      style={{
        borderWidth: 1,
        borderStyle: active ? "solid" : "dashed",
      }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      role="region"
      aria-label="공통인수 드롭 존"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {active && previewText ? (
          <motion.span
            key="preview"
            className="inline-flex items-baseline gap-1 text-label tabular text-type-primary"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            <span aria-hidden="true">→</span>
            <span>{previewText}</span>
          </motion.span>
        ) : (
          <motion.span
            key="hint"
            className="text-helper text-type-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            여기로 끌어내세요
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
