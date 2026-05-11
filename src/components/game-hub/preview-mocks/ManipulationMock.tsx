"use client";

// manipulation mechanic mock — 식 A 가 식 B 로 변환되는 화살표 진행 애니메이션.
// factorization, math-graph-shift, physics-vector, chemistry-balance.

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LOOP_DURATION, LOOP_EASE, mockWrapperClass, type MockProps } from "./shared";

export function ManipulationMock({ variant, locked }: MockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-50px" });
  const reduced = useReducedMotion();
  const animate = inView && !reduced;

  return (
    <div ref={ref} className={mockWrapperClass(locked)}>
      <div className="flex items-center gap-3 px-3">
        <Box>{variant.left ?? "A"}</Box>
        <motion.div
          className="text-pullim-slate-400"
          animate={animate ? { x: [0, 4, 0] } : undefined}
          transition={{
            duration: LOOP_DURATION,
            repeat: Infinity,
            ease: LOOP_EASE,
          }}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </motion.div>
        <motion.div
          animate={
            animate
              ? {
                  scale: [1, 1, 1.06, 1, 1],
                  borderColor: [
                    "rgb(229 229 229)",
                    "rgb(229 229 229)",
                    "rgb(0 212 161)",
                    "rgb(229 229 229)",
                    "rgb(229 229 229)",
                  ],
                }
              : undefined
          }
          transition={{
            duration: LOOP_DURATION,
            repeat: Infinity,
            times: [0, 0.4, 0.55, 0.7, 1],
            ease: LOOP_EASE,
          }}
        >
          <Box>{variant.right ?? "B"}</Box>
        </motion.div>
      </div>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper font-mono font-medium text-type-primary">
      {children}
    </div>
  );
}
