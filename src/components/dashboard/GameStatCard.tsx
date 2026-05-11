// 게임별 성과 카드 — 큰 숫자로 성공/실패 절댓값.
// `2026-05-08_home-dashboard-redesign.md` §6.2-C.

import Link from "next/link";
import type { PerGameStat } from "@/lib/core";
import { cn } from "@/lib/utils";

interface Props {
  stat: PerGameStat;
}

export function GameStatCard({ stat }: Props) {
  const Icon = stat.icon;
  const accuracyPct =
    stat.attempts > 0 ? Math.round(stat.accuracy * 100) : 0;
  const progressPct =
    stat.cardsTotal > 0
      ? Math.round((stat.cardsTouched / stat.cardsTotal) * 100)
      : 0;
  const isHeavy = stat.attempts >= 10;

  return (
    <Link
      href={`/games/${stat.gameId}`}
      className={cn(
        "group block rounded-block border bg-bg-block p-4 transition-colors",
        isHeavy
          ? "border-accent-positive/40 hover:border-accent-positive"
          : "border-border-hairline hover:border-type-primary/30",
      )}
      aria-label={`${stat.title} — 성공 ${stat.correct}, 실패 ${stat.failed}, 정답률 ${accuracyPct}%`}
    >
      {/* 헤더 — 아이콘 + 제목 */}
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-button",
            isHeavy
              ? "bg-accent-positive/10 text-accent-positive"
              : "bg-pullim-slate-100 text-pullim-slate-600",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-label font-bold text-type-primary">
            {stat.title}
          </p>
          {stat.kind === "custom" && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-type-secondary">
              내 콘텐츠
            </p>
          )}
        </div>
      </header>

      {/* 큰 숫자 — 성공·실패 양옆 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-type-secondary">
            성공
          </span>
          <span className="text-display tabular text-accent-positive">
            {stat.correct}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-type-secondary">
            실패
          </span>
          <span className="text-display tabular text-type-secondary">
            {stat.failed}
          </span>
        </div>
      </div>

      {/* 진행도 바 + 정답률 부가 */}
      <div className="mt-3">
        <div
          aria-hidden="true"
          className="h-1.5 w-full overflow-hidden rounded-full bg-pullim-slate-100"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isHeavy ? "bg-accent-positive" : "bg-pullim-slate-400",
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-helper tabular text-type-secondary">
          {stat.cardsTouched}/{stat.cardsTotal} 카드
          {stat.attempts > 0 && ` · 정답률 ${accuracyPct}%`}
        </p>
      </div>
    </Link>
  );
}
