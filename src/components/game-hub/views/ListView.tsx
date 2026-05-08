// 리스트 뷰 — 슬림 행, 한 줄에 1게임.

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";
import type { ProgressLookup } from "@/lib/games/filter";
import type { PerGameStat } from "@/lib/core";

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
          <article className="flex items-center gap-3 px-3 py-2.5">
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-button ${
                isAvailable
                  ? "bg-accent-positive/10 text-accent-positive"
                  : "bg-pullim-slate-100 text-pullim-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-label font-bold text-type-primary">
                {g.meta.title}
              </p>
              <p className="truncate text-helper text-type-secondary">
                {g.meta.subject} · {g.meta.unit} · 약 {g.meta.estimatedMinutes}분
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
          </article>
        );
        return (
          <li key={g.meta.id}>
            {isAvailable ? (
              <Link
                href={`/games/${g.meta.id}`}
                className="block rounded-block border border-border-hairline bg-bg-block transition-colors hover:border-type-primary/30"
              >
                {inner}
              </Link>
            ) : (
              <div
                aria-disabled="true"
                className="rounded-block border border-border-hairline bg-bg-primary opacity-65"
              >
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
