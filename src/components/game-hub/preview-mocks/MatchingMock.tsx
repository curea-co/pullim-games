"use client";

// matching mechanic mock — 좌·우 짝 사이에 jade 라인이 그어짐.
// english-word-match, custom-word-match.

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { LOOP_DURATION, LOOP_EASE, mockWrapperClass, type MockProps } from "./shared";

const JADE = "#00D4A1";

export function MatchingMock({ variant, locked }: MockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-50px" });
  const reduced = useReducedMotion();
  const animate = inView && !reduced;

  const pairs = variant.pairs ?? [
    { left: "apple", right: "사과" },
    { left: "book", right: "책" },
  ];

  return (
    <div ref={ref} className={mockWrapperClass(locked)}>
      <div className="relative grid grid-cols-[auto_56px_auto] items-center gap-x-3 gap-y-2 px-3">
        {pairs.map((p, i) => (
          <PairRow
            key={i}
            left={p.left}
            right={p.right}
            delay={i * 0.4}
            animate={animate}
          />
        ))}
      </div>
    </div>
  );
}

function PairRow({
  left,
  right,
  delay,
  animate,
}: {
  left: string;
  right: string;
  delay: number;
  animate: boolean;
}) {
  return (
    <>
      <Cell>{left}</Cell>
      <div className="relative h-px">
        <motion.div
          className="absolute inset-y-0 left-0 origin-left"
          style={{ height: 2, top: -1, background: JADE }}
          animate={
            animate
              ? { scaleX: [0, 0, 1, 1, 0, 0], opacity: [0, 0, 1, 1, 0, 0] }
              : undefined
          }
          transition={{
            duration: LOOP_DURATION,
            repeat: Infinity,
            times: [0, 0.15 + delay * 0.05, 0.35 + delay * 0.05, 0.7, 0.85, 1],
            ease: LOOP_EASE,
          }}
        />
      </div>
      <Cell>{right}</Cell>
    </>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-button border border-border-hairline bg-bg-block px-2.5 py-1 text-helper text-type-primary">
      {children}
    </div>
  );
}
