"use client";

// 활동 히트맵 — 게임별 × 최근 14일 attempts 분포.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 2.
//
// 외부 차트 라이브러리 X — SVG 직접 구현 (의존성 0).
// 색상: accent-positive 단조 (학습 강도). 빨강·금색 X (외재 보상 회피, 메모리 룰).

import { useEffect, useMemo, useRef, useState } from "react";
import { loadActivityForGames, type PerGameStat } from "@/lib/core";
import { cn } from "@/lib/utils";

interface Props {
  /** dashboard.perGame 중 cardsTouched > 0 인 게임만 렌더. */
  playedStats: PerGameStat[];
  /** 표시할 일 수. 기본 14. */
  days?: number;
}

interface HoverCell {
  gameId: string;
  title: string;
  date: string;
  count: number;
}

const CELL_PX = 14;
const CELL_GAP_PX = 3;
const LABEL_COL_PX = 96; // 게임명 좌측 라벨
const HEADER_ROW_PX = 18; // 날짜 헤더 (요일 dot)

/** count → intensity bucket (0~4). 0=empty, 4=heaviest. */
function intensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

const INTENSITY_FILL: Record<number, string> = {
  0: "fill-bg-canvas",
  1: "fill-accent-positive/20",
  2: "fill-accent-positive/40",
  3: "fill-accent-positive/70",
  4: "fill-accent-positive",
};

const INTENSITY_STROKE = "stroke-border-hairline";

function formatTooltipDate(bucket: string): string {
  // "2026-05-18" → "5/18"
  const [, m, d] = bucket.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function ActivityHeatmap({ playedStats, days = 14 }: Props) {
  const [activityMap, setActivityMap] = useState<Map<
    string,
    Array<{ date: string; count: number }>
  > | null>(null);
  const [hover, setHover] = useState<HoverCell | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const gameIds = useMemo(
    () => playedStats.map((p) => p.gameId),
    [playedStats],
  );

  useEffect(() => {
    if (gameIds.length === 0) {
      setActivityMap(new Map());
      return;
    }
    setActivityMap(loadActivityForGames(gameIds, days));
  }, [gameIds, days]);

  if (!activityMap || playedStats.length === 0) {
    return null;
  }

  const rows = playedStats.length;
  const width = LABEL_COL_PX + days * (CELL_PX + CELL_GAP_PX);
  const height = HEADER_ROW_PX + rows * (CELL_PX + CELL_GAP_PX);

  // 날짜 헤더 — 0번 게임 첫 row 의 date 들 (모든 row 동일).
  const firstRow = activityMap.get(playedStats[0]!.gameId) ?? [];

  return (
    <section
      aria-label="최근 활동 히트맵"
      className="flex flex-col gap-2 rounded-block border border-border-hairline bg-bg-block p-4"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-label font-bold text-type-primary">최근 활동</h2>
        <p className="text-helper text-type-secondary">
          최근 {days}일 · 진하게 = 많이 풀이
        </p>
      </header>
      <div
        ref={ref}
        className="relative overflow-x-auto"
        onPointerLeave={() => setHover(null)}
      >
        <svg
          role="img"
          aria-label={`${playedStats.length}개 게임 × 최근 ${days}일 활동 히트맵`}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="max-w-full"
        >
          {/* 날짜 헤더 — 첫 날·중간·마지막만 텍스트 표시 */}
          {firstRow.map((cell, i) => {
            const isFirst = i === 0;
            const isMid = i === Math.floor(firstRow.length / 2);
            const isLast = i === firstRow.length - 1;
            if (!isFirst && !isMid && !isLast) return null;
            return (
              <text
                key={cell.date}
                x={LABEL_COL_PX + i * (CELL_PX + CELL_GAP_PX) + CELL_PX / 2}
                y={HEADER_ROW_PX - 6}
                className="fill-type-tertiary text-[10px]"
                textAnchor="middle"
              >
                {formatTooltipDate(cell.date)}
              </text>
            );
          })}

          {/* 각 게임 row */}
          {playedStats.map((stat, rowIdx) => {
            const cells = activityMap.get(stat.gameId) ?? [];
            const y = HEADER_ROW_PX + rowIdx * (CELL_PX + CELL_GAP_PX);
            return (
              <g key={stat.gameId}>
                {/* 게임명 라벨 */}
                <text
                  x={0}
                  y={y + CELL_PX - 3}
                  className="fill-type-secondary text-[11px]"
                >
                  {stat.title.length > 10
                    ? stat.title.slice(0, 10) + "…"
                    : stat.title}
                </text>
                {/* 셀 */}
                {cells.map((cell, colIdx) => {
                  const x = LABEL_COL_PX + colIdx * (CELL_PX + CELL_GAP_PX);
                  const lv = intensity(cell.count);
                  return (
                    <rect
                      key={cell.date}
                      x={x}
                      y={y}
                      width={CELL_PX}
                      height={CELL_PX}
                      rx={2}
                      className={cn(
                        INTENSITY_FILL[lv],
                        lv === 0 && INTENSITY_STROKE,
                        "cursor-pointer transition-opacity hover:opacity-80",
                      )}
                      onPointerEnter={() =>
                        setHover({
                          gameId: stat.gameId,
                          title: stat.title,
                          date: cell.date,
                          count: cell.count,
                        })
                      }
                      onClick={() =>
                        setHover({
                          gameId: stat.gameId,
                          title: stat.title,
                          date: cell.date,
                          count: cell.count,
                        })
                      }
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {hover && (
          <div
            role="status"
            className="pointer-events-none absolute left-0 top-0 rounded-block border border-border-hairline bg-bg-block px-2.5 py-1.5 text-helper shadow-md"
            style={{ transform: "translate(8px, 8px)" }}
          >
            <span className="font-bold text-type-primary">{hover.title}</span>
            <span className="ml-1.5 text-type-secondary">
              · {formatTooltipDate(hover.date)} · {hover.count}장
            </span>
          </div>
        )}
      </div>

      {/* 범례 */}
      <ul
        aria-label="활동 강도 범례"
        className="flex items-center gap-1.5 text-helper text-type-tertiary"
      >
        <li>적음</li>
        {[0, 1, 2, 3, 4].map((lv) => (
          <li
            key={lv}
            aria-hidden="true"
            className={cn(
              "h-3 w-3 rounded-sm",
              lv === 0 ? "border border-border-hairline" : "",
              lv === 0 && "bg-bg-canvas",
              lv === 1 && "bg-accent-positive/20",
              lv === 2 && "bg-accent-positive/40",
              lv === 3 && "bg-accent-positive/70",
              lv === 4 && "bg-accent-positive",
            )}
          />
        ))}
        <li>많음</li>
      </ul>
    </section>
  );
}
