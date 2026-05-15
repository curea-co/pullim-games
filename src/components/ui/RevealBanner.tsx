"use client";

import { motion } from "framer-motion";

interface Props {
  attemptCount: number;
  message?: string;
  className?: string;
}

export function RevealBanner({
  attemptCount,
  message = "여러 번 시도했어요. 정답을 보여줄게요.",
  className,
}: Props) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center justify-between gap-3 rounded-block border border-accent-positive/40 bg-accent-positive/10 px-4 py-3 text-body text-type-primary ${className ?? ""}`}
    >
      <span>{message}</span>
      <span className="text-helper tabular text-type-secondary">
        시도 {attemptCount}회
      </span>
    </motion.div>
  );
}
