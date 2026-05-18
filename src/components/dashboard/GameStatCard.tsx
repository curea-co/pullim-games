// 게임별 성과 카드 — 큰 숫자로 성공/실패 절댓값 + 7일 sparkline.

import Link from "next/link";
import type { PerGameStat } from "@/lib/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameSparkline } from "@/components/dashboard/GameSparkline";
import { cn } from "@/lib/utils";

interface Props {
  stat: PerGameStat;
}

export function GameStatCard({ stat }: Props) {
  const Icon = stat.icon;
  const accuracyPct =
    stat.attempts > 0 ? Math.round(stat.accuracy * 100) : 0;
  const isHeavy = stat.attempts >= 10;

  return (
    <Link
      href={`/games/${stat.gameId}`}
      aria-label={`${stat.title} — 성공 ${stat.correct}, 실패 ${stat.failed}, 정답률 ${accuracyPct}%`}
      className="group block"
    >
      <Card
        className={cn(
          "rounded-block bg-bg-block p-4 shadow-none transition-colors",
          isHeavy
            ? "border-accent-positive/40 group-hover:border-accent-positive"
            : "border-border-hairline group-hover:border-type-primary/30",
        )}
      >
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
          <div className="min-w-0 flex-1">
            <p className="truncate text-label font-bold text-type-primary">
              {stat.title}
            </p>
            {stat.kind === "custom" && (
              <Badge
                variant="outline"
                className="mt-0.5 border-border-hairline bg-bg-block px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-type-secondary"
              >
                내 콘텐츠
              </Badge>
            )}
          </div>
        </header>

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

        <div className="mt-3">
          <GameSparkline
            gameId={stat.gameId}
            variant={isHeavy ? "active" : "muted"}
          />
          <p className="mt-1.5 text-helper tabular text-type-secondary">
            {stat.cardsTouched}/{stat.cardsTotal} 카드
            {stat.attempts > 0 && ` · 정답률 ${accuracyPct}%`}
          </p>
        </div>
      </Card>
    </Link>
  );
}
