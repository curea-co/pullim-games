// 썸네일 뷰 — 작은 정사각 그리드. shadcn Card.

import Link from "next/link";
import { Lock } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";
import type { ProgressLookup } from "@/lib/games/filter";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  games: GameManifest[];
  progress?: ProgressLookup;
}

export function ThumbnailView({ games, progress }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {games.map((g) => {
        const Icon = g.meta.icon;
        const isAvailable = g.meta.status === "available";
        const bucket = progress?.byGameId.get(g.meta.id) ?? "untouched";
        const inner = (
          <Card className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-block border-border-hairline bg-bg-block p-3 text-center shadow-none transition-colors hover:border-type-primary/30">
            {bucket !== "untouched" && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-2 top-2 h-2 w-2 rounded-full",
                  bucket === "completed"
                    ? "bg-accent-positive"
                    : "bg-pullim-slate-400",
                )}
              />
            )}
            {!isAvailable && (
              <Lock
                className="absolute right-2 top-2 h-3.5 w-3.5 text-type-secondary/60"
                aria-hidden="true"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-button",
                isAvailable
                  ? "bg-accent-positive/10 text-accent-positive"
                  : "bg-pullim-slate-100 text-pullim-slate-500",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="line-clamp-2 text-helper font-bold leading-snug text-type-primary">
              {g.meta.title}
            </p>
          </Card>
        );
        return (
          <li key={g.meta.id}>
            {isAvailable ? (
              <Link
                href={`/games/${g.meta.id}`}
                className="block rounded-block focus-visible:outline-2 focus-visible:outline-accent-positive"
              >
                {inner}
              </Link>
            ) : (
              <div className="opacity-65" aria-disabled="true">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
