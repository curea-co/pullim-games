"use client";

// multiple-choice mechanic mock — 4 보기 중 정답이 jade 글로우.
// math-quick-quiz, custom-multiple-choice, english-blank, custom-blank.

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { LOOP_DURATION, LOOP_EASE, mockWrapperClass, type MockProps } from "./shared";

export function MultipleChoiceMock({ variant, locked }: MockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-50px" });
  const reduced = useReducedMotion();
  const animate = inView && !reduced;

  const question = variant.question ?? "Q";
  const choices = variant.choices ?? ["A", "B", "C", "D"];
  const correctIndex = variant.correctIndex ?? 1;

  return (
    <div ref={ref} className={mockWrapperClass(locked)}>
      <div className="flex flex-col items-center gap-2 px-3">
        <p className="text-helper text-type-secondary">{question}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {choices.map((c, i) => {
            const isCorrect = i === correctIndex;
            return (
              <motion.div
                key={i}
                animate={
                  animate && isCorrect
                    ? {
                        scale: [1, 1, 1.08, 1.08, 1, 1],
                        backgroundColor: [
                          "rgb(255 255 255)",
                          "rgb(255 255 255)",
                          "rgba(0 212 161 / 0.18)",
                          "rgba(0 212 161 / 0.18)",
                          "rgb(255 255 255)",
                          "rgb(255 255 255)",
                        ],
                        borderColor: [
                          "rgb(229 229 229)",
                          "rgb(229 229 229)",
                          "rgb(0 212 161)",
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
                  times: [0, 0.35, 0.5, 0.7, 0.85, 1],
                  ease: LOOP_EASE,
                }}
                className="flex h-7 w-16 items-center justify-center rounded-button border border-border-hairline text-helper text-type-primary"
              >
                {c}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
