"use client";

// sorting mechanic mock — 3 박스가 무작위 → 정렬되는 슬라이드.
// history-timeline, english-order.

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { LOOP_DURATION, LOOP_EASE, mockWrapperClass, type MockProps } from "./shared";

export function SortingMock({ variant, locked }: MockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-50px" });
  const reduced = useReducedMotion();
  const animate = inView && !reduced;

  const shuffled = variant.itemsShuffled ?? ["B", "A", "C"];
  const sorted = variant.itemsSorted ?? ["A", "B", "C"];

  // 각 슬롯의 x position: shuffled 순서를 sorted 의 인덱스 (0,1,2) 위치로 보냄.
  // shuffled[i] 가 sorted 안 어디 있는지 = target index → x = (target - i) * 80
  const slots = shuffled.map((label, i) => {
    const target = sorted.indexOf(label);
    return { label, deltaX: (target - i) * 56 };
  });

  return (
    <div ref={ref} className={mockWrapperClass(locked)}>
      <div className="flex gap-2">
        {slots.map((s, i) => (
          <motion.div
            key={i}
            animate={
              animate
                ? {
                    x: [0, s.deltaX, s.deltaX, 0, 0],
                    backgroundColor: [
                      "rgb(255 255 255)",
                      "rgb(255 255 255)",
                      "rgba(0 212 161 / 0.1)",
                      "rgb(255 255 255)",
                      "rgb(255 255 255)",
                    ],
                  }
                : undefined
            }
            transition={{
              duration: LOOP_DURATION,
              repeat: Infinity,
              times: [0, 0.4, 0.65, 0.85, 1],
              ease: LOOP_EASE,
            }}
            className="flex h-10 w-12 items-center justify-center rounded-button border border-border-hairline text-helper font-medium text-type-primary"
          >
            {s.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
