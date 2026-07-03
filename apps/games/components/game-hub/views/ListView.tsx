// 리스트 뷰 — 슬림 행, 한 줄에 1게임. shadcn Card.

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";
import type { ProgressLookup } from "@/lib/games/filter";
import type { PerGameStat } from "@/lib/core";
import { Card } from "@/components/ui/card";
import { subjectBadgeClass } from "@/lib/games/subject-badge";
import { cn } from "@/lib/utils";

interface Props {
  games: GameManifest[];
  progress?: ProgressLookup;
  perGame?: PerGameStat[];
}

export function ListView({ games, perGame }: Props) {
  const statByGame = new Map(perGame?.map((p) => [p.gameId, p]) ?? []);
  return (
    <ul className="flex flex-col gap-2">
      {games.map((g) => {
        const Icon = g.meta.icon;
        const stat = statByGame.get(g.meta.id);
        const isAvailable = g.meta.status === "available";
        const inner = (
          <Card
            className={cn(
              "flex items-center gap-3 rounded-block px-3 py-2.5 shadow-none transition-colors",
              isAvailable
                ? "border-border-hairline bg-bg-block hover:border-type-primary/30"
                : "border-border-hairline bg-bg-primary opacity-65",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-button",
                isAvailable
                  ? "bg-accent-positive/10 text-accent-positive"
                  : "bg-pullim-slate-100 text-pullim-slate-500",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-bold text-type-primary">
                {g.meta.title}
              </p>
              <p className="truncate text-helper">
                <span
                  className={cn(
                    "mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    subjectBadgeClass(g.meta.subject),
                  )}
                >
                  {g.meta.subject}
                </span>
                <span className="text-type-secondary">
                  {g.meta.unit} · 약 {g.meta.estimatedMinutes}분
                </span>
              </p>
            </div>
            {stat && stat.cardsTotal > 0 && (
              <span className="shrink-0 text-helper tabular text-type-secondary">
                {stat.cardsTouched}/{stat.cardsTotal}
              </span>
            )}
            {isAvailable ? (
              <ArrowRight className="h-4 w-4 shrink-0 text-type-secondary/40" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-type-secondary/60" />
            )}
          </Card>
        );
        return (
          <li key={g.meta.id}>
            {isAvailable ? (
              <Link href={`/games/${g.meta.id}`} data-cta-priority="informational" className="block rounded-block">
                {inner}
              </Link>
            ) : (
              <div aria-disabled="true">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
