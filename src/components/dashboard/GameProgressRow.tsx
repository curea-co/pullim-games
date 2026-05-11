// 게임별 진행 행.
// `2026-05-08_home-dashboard.md` §6.3.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { games } from "@/lib/games/registry";
import type { PerGameStat } from "@/lib/core";

interface Props {
  stat: PerGameStat;
}

export function GameProgressRow({ stat }: Props) {
  const game = games.find((g) => g.meta.id === stat.gameId);
  const Icon = game?.meta.icon;
  const progressPct =
    stat.cardsTotal > 0
      ? Math.round((stat.cardsTouched / stat.cardsTotal) * 100)
      : 0;
  const accuracyPct =
    stat.attempts > 0 ? Math.round(stat.accuracy * 100) : 0;
  const isStrong = stat.attempts > 0 && stat.accuracy >= 0.7;

  return (
    <Link
      href={`/games/${stat.gameId}`}
      className="group flex items-center gap-3 rounded-block border border-border-hairline bg-bg-block p-3 transition-colors hover:border-type-primary/30"
      aria-label={`${stat.title} — ${stat.cardsTouched}/${stat.cardsTotal} 진행, 정답률 ${accuracyPct}%`}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-button ${
            isStrong
              ? "bg-accent-positive/10 text-accent-positive"
              : "bg-pullim-slate-100 text-pullim-slate-600"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-label font-bold text-type-primary">
          {stat.title}
        </p>
        <div className="mt-1 flex items-center gap-2 text-helper text-type-secondary">
          <span className="tabular">
            {stat.cardsTouched}/{stat.cardsTotal} 카드
          </span>
          {stat.attempts > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular">정답률 {accuracyPct}%</span>
            </>
          )}
        </div>
        {/* 진행도 바 */}
        <div
          aria-hidden="true"
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-pullim-slate-100"
        >
          <div
            className={`h-full rounded-full transition-all ${
              isStrong ? "bg-accent-positive" : "bg-pullim-slate-400"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-type-secondary/40 transition-colors group-hover:text-type-primary" />
    </Link>
  );
}
