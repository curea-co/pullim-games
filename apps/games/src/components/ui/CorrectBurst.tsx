"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  // 핵심: `show` 는 trigger 신호로만 사용. visible 은 trigger 후 durationMs 동안 유지된다.
  // 이전 구현은 useEffect cleanup 에서 timer 를 clear 했기 때문에, 부모가 `show` 를 false 로
  // 빠르게 돌리면 (예: factorization 의 phase "extracting" → 240ms 후 "done") timer 가 죽고
  // visible 이 true 인 채로 박혀버렸다. 이제 timerRef 로 timer 를 유지하고 cleanup 은 unmount 시에만.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
      onDone?.();
    }, durationMs);
    // 의도적으로 cleanup 없음 — show 가 false 로 돌아와도 burst 가 끝까지 재생되어야 함.
  }, [show, durationMs, onDone]);

  // unmount 시에만 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
