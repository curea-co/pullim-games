"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  show: boolean;
  onDone?: () => void;
  durationMs?: number;
}

export function CorrectBurst({ show, onDone, durationMs = 700 }: Props) {
  const [visible, setVisible] = useState(false);

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
          transition={{ duration: 0.16 }}
        >
          <motion.div
            className="flex h-28 w-28 items-center justify-center rounded-full bg-accent-positive text-bg-block shadow-glow"
            initial={{ scale: 0.2 }}
            animate={{ scale: [0.2, 1.15, 1] }}
            transition={{
              duration: 0.45,
              times: [0, 0.6, 1],
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Check className="h-14 w-14" strokeWidth={3} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
