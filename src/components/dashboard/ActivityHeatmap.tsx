"use client";

// 활동 히트맵 — 최근 14일 합산 (게임 분리 X, 단순화).
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 2.
//
// 단순화 기준:
// - 게임별 row 분리 X (모든 게임 합산)
// - 14일 단일 row, 큰 셀
// - 색상 3 단계 (없음 / 약 / 강) — 부드러운 단조
// - 외부 lib X — div grid 로 충분 (SVG X).

import { useEffect, useMemo, useState } from "react";
import { loadActivityForGames, type PerGameStat } from "@/lib/core";
import { cn } from "@/lib/utils";

interface Props {
  /** dashboard.perGame 중 cardsTouched > 0 인 게임만. */
  playedStats: PerGameStat[];
  /** 표시할 일 수. 기본 14. */
  days?: number;
}

function aggregateDaily(
  map: Map<string, Array<{ date: string; count: number }>>,
): Array<{ date: string; count: number }> {
  if (map.size === 0) return [];
  const first = map.values().next().value;
  if (!first) return [];
  // 같은 date 슬롯끼리 합산
  return first.map((entry, idx) => {
    let total = 0;
    for (const series of map.values()) {
      total += series[idx]?.count ?? 0;
    }
    return { date: entry.date, count: total };
  });
}

/** count → intensity bucket (0~3). 약/중/강 3 단계 + 빈 셀. */
function intensity(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  return 3;
}

const INTENSITY_BG: Record<number, string> = {
  0: "bg-bg-canvas border border-border-hairline",
  1: "bg-accent-positive/25",
  2: "bg-accent-positive/55",
  3: "bg-accent-positive/85",
};

function formatShortDate(bucket: string): string {
  const [, m, d] = bucket.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function ActivityHeatmap({ playedStats, days = 14 }: Props) {
  const [aggregated, setAggregated] = useState<
    Array<{ date: string; count: number }>
  >([]);

  const gameIds = useMemo(
    () => playedStats.map((p) => p.gameId),
    [playedStats],
  );

  useEffect(() => {
    if (gameIds.length === 0) {
      setAggregated([]);
      return;
    }
    const map = loadActivityForGames(gameIds, days);
    setAggregated(aggregateDaily(map));
  }, [gameIds, days]);

  if (aggregated.length === 0) return null;

  const total = aggregated.reduce((sum, e) => sum + e.count, 0);
  const activeDays = aggregated.filter((e) => e.count > 0).length;

  return (
    <section
      aria-label="최근 활동 히트맵"
      className="flex flex-col gap-3 rounded-block border border-border-hairline bg-bg-block p-4"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-label font-bold text-type-primary">최근 활동</h2>
        <p className="text-helper tabular text-type-secondary">
          {days}일 중 {activeDays}일 · 총 {total}장
        </p>
      </header>
      <ul
        aria-label={`최근 ${days}일 일별 활동 셀`}
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${Math.min(days, 14)}, minmax(0, 1fr))`,
        }}
      >
        {aggregated.map((entry) => {
          const lv = intensity(entry.count);
          return (
            <li
              key={entry.date}
              aria-label={`${formatShortDate(entry.date)} ${entry.count}장`}
              title={`${formatShortDate(entry.date)} · ${entry.count}장`}
              className={cn(
                "flex aspect-square items-end justify-center rounded-sm",
                INTENSITY_BG[lv],
              )}
            >
              {/* 첫 셀(가장 오래된)과 마지막 셀(오늘)에만 작은 날짜 */}
            </li>
          );
        })}
      </ul>
      <footer className="flex items-baseline justify-between text-helper text-type-tertiary">
        <span>{formatShortDate(aggregated[0]!.date)}</span>
        <span className="flex items-center gap-1.5">
          적음
          <span className="h-2.5 w-2.5 rounded-sm border border-border-hairline bg-bg-canvas" />
          <span className="h-2.5 w-2.5 rounded-sm bg-accent-positive/25" />
          <span className="h-2.5 w-2.5 rounded-sm bg-accent-positive/55" />
          <span className="h-2.5 w-2.5 rounded-sm bg-accent-positive/85" />
          많음
        </span>
        <span>오늘 ({formatShortDate(aggregated[aggregated.length - 1]!.date)})</span>
      </footer>
    </section>
  );
}
