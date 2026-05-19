"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  show: boolean;
  onDone?: () => void;
  durationMs?: number;
}

export function CorrectBurst({ show, onDone, durationMs = 700 }: Props) {
  const [visible, setVisible] = useState(false);
  // prefers-reduced-motion 존중 — globals.css §45 메모 약속 이행 (Plan A Phase 6).
  // reduced 시 scale 모션 스킵, 정적 체크 마크만 표시.
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [show, durationMs, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.16 }}
        >
          <motion.div
            className="flex h-28 w-28 items-center justify-center rounded-full bg-accent-positive text-bg-block shadow-glow"
            initial={reducedMotion ? { scale: 1 } : { scale: 0.2 }}
            animate={reducedMotion ? { scale: 1 } : { scale: [0.2, 1.15, 1] }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    duration: 0.45,
                    times: [0, 0.6, 1],
                    ease: [0.16, 1, 0.3, 1],
                  }
            }
          >
            <Check className="h-14 w-14" strokeWidth={3} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
