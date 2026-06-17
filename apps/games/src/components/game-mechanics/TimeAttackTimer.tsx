"use client";

// time-attack 모드 타이머 — 카드별 30초 제한 (Plan E D1.3 — "카드별 30초" 채택).
//
// 메모리 룰 feedback_design_priorities:
//   "학습효과 > 중독성, PVE 지향, 하이퍼캐주얼".
// 메모리 룰 feedback_scale_hypercasual:
//   "보스레이드·장비·시즌 등 RPG 확장 제안 금지".
// Plan E §0.C: "time-attack 시간 제한은 학습 압박 X — 캐주얼 톤 유지".
//
// 사용:
//   <TimeAttackTimer
//     active={mode === "time-attack" && phase === "playing"}
//     resetKey={cardIndex}   // 카드 바뀔 때마다 timer 재시작
//     durationMs={30_000}
//     onExpire={() => handleTimeout()}
//   />
//
// 표시: bar + tabular 잔여 초. 끝나기 직전 5초는 색만 부드럽게 강조 (압박 X).
// 정확도: requestAnimationFrame · 60fps 부드러운 progress.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** 활성화 여부 — false 면 표시 X, timer X. */
  active: boolean;
  /** 변경 시 timer 재시작. 보통 cardIndex. */
  resetKey: string | number;
  /** 제한 시간 ms. default 30_000. */
  durationMs?: number;
  /** 시간 초과 콜백. 호출 후 onExpire 가 다시 active=false 로 만들 책임. */
  onExpire: () => void;
  /** 외부 className (sticky 등). */
  className?: string;
}

const DEFAULT_DURATION_MS = 30_000;
const WARN_THRESHOLD_MS = 5_000;

export function TimeAttackTimer({
  active,
  resetKey,
  durationMs = DEFAULT_DURATION_MS,
  onExpire,
  className,
}: Props) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  // 최신 onExpire 캡처 — effect deps 에 함수 안 넣고 ref 통한 안정 호출.
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setRemainingMs(durationMs);
      startedAtRef.current = null;
      expiredRef.current = false;
      return;
    }

    startedAtRef.current = performance.now();
    expiredRef.current = false;
    setRemainingMs(durationMs);

    function tick() {
      if (startedAtRef.current === null) return;
      const elapsed = performance.now() - startedAtRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, resetKey, durationMs]);

  if (!active) return null;

  const progress = Math.max(0, Math.min(1, remainingMs / durationMs));
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const isWarn = remainingMs < WARN_THRESHOLD_MS && remainingMs > 0;

  return (
    <div
      data-testid="time-attack-timer"
      role="timer"
      aria-live="off"
      aria-label={`남은 시간 ${secondsLeft}초`}
      className={cn(
        // 컴팩트 — 좁은 viewport(320×568)에서 header 추가 높이가 CTA 를 viewport 밖으로 밀지 않게.
        "flex items-center gap-2 rounded-button border border-border-hairline bg-bg-block px-2 py-0.5",
        className,
      )}
    >
      <div
        className="relative h-1 flex-1 overflow-hidden rounded-button bg-bg-primary"
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-full transition-[background-color] duration-300",
            // 5초 잔여 시 부드러운 강조 — 압박 X (캐주얼 톤 유지).
            // 정의된 토큰만 사용 (memory: 디자인 토큰 미정의 silent fallback 회피).
            isWarn ? "bg-accent-negative" : "bg-accent-positive",
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span
        data-testid="time-attack-seconds"
        className={cn(
          "min-w-[2ch] text-helper tabular",
          isWarn ? "text-accent-negative" : "text-type-secondary",
        )}
      >
        {secondsLeft}s
      </span>
    </div>
  );
}
