// 미진행 게임 썸네일 그리드 — 다양성 보강. shadcn Card.

import Link from "next/link";
import type { PerGameStat } from "@/lib/core";
import { Card } from "@/components/ui/card";

interface Props {
  /** 미진행 게임만 (cardsTouched === 0) */
  games: PerGameStat[];
}

export function UntouchedGamesGrid({ games }: Props) {
  if (games.length === 0) return null;

  return (
    <section aria-label="만나지 못한 게임" className="flex flex-col gap-2">
      <header>
        <h2 className="text-label font-bold text-type-primary">
          만나지 못한 게임 {games.length}개
        </h2>
        <p className="text-helper text-type-secondary">
          새 메커닉을 한번 풀어보세요
        </p>
      </header>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {games.map((stat) => {
          const Icon = stat.icon;
          return (
            <li key={stat.gameId}>
              <Link
                href={`/games/${stat.gameId}`}
                aria-label={`${stat.title} 시작`}
                className="group block"
              >
                <Card className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-block border-border-hairline bg-bg-block p-2 text-center opacity-65 shadow-none transition-colors group-hover:border-type-primary/30 group-hover:opacity-100">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-500 group-hover:bg-accent-positive/10 group-hover:text-accent-positive"
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <p className="line-clamp-2 text-[10px] font-bold leading-tight text-type-primary">
                    {stat.title}
                  </p>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
