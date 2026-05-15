"use client";

import { useCallback, useEffect, useState } from "react";

interface Result {
  wrongCount: number;
  shouldReveal: boolean;
  recordWrong: () => void;
  reset: () => void;
}

/**
 * 같은 카드(cardId) 에 대한 wrong 누적 횟수를 세션 in-memory 로 추적.
 * threshold 도달 시 shouldReveal=true. cardId 변경 시 자동 reset.
 *
 * 새로고침/페이지 이탈 시 카운터는 사라짐 — FSRS lapse 와 무관한 짧은 학습 안전망.
 */
export function useAttemptCounter(cardId: string, threshold = 5): Result {
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    setWrongCount(0);
  }, [cardId]);

  const recordWrong = useCallback(() => {
    setWrongCount((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    setWrongCount(0);
  }, []);

  return {
    wrongCount,
    shouldReveal: wrongCount >= threshold,
    recordWrong,
    reset,
  };
}
