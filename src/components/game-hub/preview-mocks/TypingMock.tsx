"use client";

// typing mechanic mock — 단어가 한 글자씩 추가됨 (typewriter).
// vocab-typing, custom-typing.

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { LOOP_DURATION, mockWrapperClass, type MockProps } from "./shared";

export function TypingMock({ variant, locked }: MockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-50px" });
  const reduced = useReducedMotion();
  const animate = inView && !reduced;

  const word = variant.word ?? "photo";
  const hint = variant.hint;

  // 글자 단계: 첫 0초~ 1초 비어있음, 그 다음 글자별로 표시, 마지막 0.5초 완성 + 글로우, 페이드.
  // 각 글자 i 의 opacity keyframes: [0, 0 until step_i, 1, 1, 0]
  const total = word.length;
  return (
    <div ref={ref} className={mockWrapperClass(locked)}>
      <div className="flex flex-col items-center gap-2 px-3">
        {hint && <p className="text-helper text-type-secondary">{hint}</p>}
        <div className="flex items-center gap-0.5 font-mono text-base font-bold tracking-wider text-type-primary">
          {[...word].map((ch, i) => {
            const start = 0.1 + (i / total) * 0.5;
            const end = 0.7;
            return (
              <motion.span
                key={i}
                animate={animate ? { opacity: [0, 0, 1, 1, 0] } : undefined}
                transition={{
                  duration: LOOP_DURATION,
                  repeat: Infinity,
                  times: [0, start, start + 0.02, end, 1],
                  ease: "easeOut",
                }}
                className="inline-block min-w-3"
              >
                {ch}
              </motion.span>
            );
          })}
          <motion.span
            animate={
              animate
                ? { opacity: [1, 1, 1, 0, 0], color: ["#0F172A", "#0F172A", "#0F172A", "#0362DA", "#0F172A"] }
                : undefined
            }
            transition={{
              duration: LOOP_DURATION,
              repeat: Infinity,
              times: [0, 0.6, 0.65, 0.7, 1],
            }}
            aria-hidden="true"
            className="inline-block w-1"
          >
            ▍
          </motion.span>
        </div>
      </div>
    </div>
  );
}
