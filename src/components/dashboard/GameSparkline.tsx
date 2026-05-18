// 게임별 sparkline — 최근 N일 attempts 미니 SVG line+area chart.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 3.
//
// 외부 차트 lib X — SVG path 직접 생성 (의존성 0).

"use client";

import { useEffect, useMemo, useState } from "react";
import { loadActivity } from "@/lib/core";
import { buildPaths } from "./sparkline-paths";
import { cn } from "@/lib/utils";

interface Props {
  gameId: string;
  /** 표시할 일 수. 기본 7. */
  days?: number;
  /** SVG width — 컨테이너 폭에 맞추려면 100% (viewBox 스케일). 기본 100. */
  width?: number;
  /** SVG height. 기본 24. */
  height?: number;
  /** 강조 색상 — accent-positive 사용. 약하면 muted. */
  variant?: "active" | "muted";
}

export function GameSparkline({
  gameId,
  days = 7,
  width = 100,
  height = 24,
  variant = "active",
}: Props) {
  const [counts, setCounts] = useState<number[]>([]);

  useEffect(() => {
    const data = loadActivity(gameId, days);
    setCounts(data.map((d) => d.count));
  }, [gameId, days]);

  const paths = useMemo(
    () => buildPaths(counts, width, height),
    [counts, width, height],
  );

  if (counts.length === 0) {
    // 데이터 로딩 전 — 빈 baseline
    return (
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        className="h-6 w-full"
      >
        <line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          className="stroke-border-hairline"
          strokeWidth={1}
        />
      </svg>
    );
  }

  const total = counts.reduce((s, c) => s + c, 0);
  const hasActivity = total > 0;

  return (
    <svg
      role="img"
      aria-label={`최근 ${days}일 활동 추이 — 총 ${total}장`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-6 w-full"
    >
      {hasActivity ? (
        <>
          <path
            d={paths.area}
            className={cn(
              variant === "active"
                ? "fill-accent-positive/15"
                : "fill-pullim-slate-200/50",
            )}
          />
          <path
            d={paths.line}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={cn(
              variant === "active"
                ? "stroke-accent-positive"
                : "stroke-pullim-slate-400",
            )}
          />
        </>
      ) : (
        <line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          className="stroke-border-hairline"
          strokeWidth={1}
        />
      )}
    </svg>
  );
}
