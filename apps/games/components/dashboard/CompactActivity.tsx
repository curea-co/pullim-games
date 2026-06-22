// 게임 활동 컴팩트 요약 — 옛 GameStatCard(큰 2-col 숫자+sparkline) + UntouchedGamesGrid(aspect-square 그리드) 통합 대체.
// 풀어본 게임은 슬림 row (icon · 제목 · 성공·실패 · 카드 진행) 최대 5개, 그 아래 한 줄로 미진행 게임 요약 + 게임 허브 CTA.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PerGameStat } from "@/lib/core";
import { cn } from "@/lib/utils";

interface Props {
  played: PerGameStat[];
  untouchedCount: number;
  totalGames: number;
  limit?: number;
}

export function CompactActivity({
  played,
  untouchedCount,
  totalGames,
  limit = 5,
}: Props) {
  const top = played.slice(0, limit);
  const overflowCount = Math.max(0, played.length - limit);

  return (
    <section
      aria-label="게임 활동"
      className="flex flex-col rounded-block border border-border-hairline bg-bg-block"
    >
      {top.length > 0 && (
        <ul className="divide-y divide-border-hairline">
          {top.map((p) => (
            <li key={p.gameId}>
              <CompactRow stat={p} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/games"
        className="flex items-center justify-between gap-3 border-t border-border-hairline px-4 py-3 text-helper text-type-secondary first:border-t-0 hover:bg-pullim-slate-50"
      >
        <span className="tabular">
          {played.length > 0
            ? `전체 ${totalGames}개 중 ${played.length}개 풀이${
                overflowCount > 0 ? ` (+${overflowCount} 더 있음)` : ""
              }${untouchedCount > 0 ? ` · 안 풀어본 ${untouchedCount}개` : ""}`
            : `${totalGames}개 메커닉을 둘러보세요`}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-type-primary">
          게임 허브
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}

function CompactRow({ stat }: { stat: PerGameStat }) {
  const Icon = stat.icon;
  const accuracyPct =
    stat.attempts > 0 ? Math.round(stat.accuracy * 100) : 0;
  const isHeavy = stat.attempts >= 10;

  return (
    <Link
      href={`/games/${stat.gameId}`}
      aria-label={`${stat.title} — 성공 ${stat.correct}, 실패 ${stat.failed}, 정답률 ${accuracyPct}%`}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-pullim-slate-50"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-button",
          isHeavy
            ? "bg-accent-positive/10 text-accent-positive"
            : "bg-pullim-slate-100 text-pullim-slate-500",
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 truncate text-label font-medium text-type-primary">
        {stat.title}
      </span>
      <span className="shrink-0 text-helper tabular text-type-secondary">
        <span className="font-bold text-accent-positive">{stat.correct}</span>
        <span className="mx-1 text-pullim-slate-300">·</span>
        <span className="font-bold text-type-secondary">{stat.failed}</span>
        {stat.attempts > 0 && (
          <span className="ml-2 text-type-secondary">
            {accuracyPct}%
          </span>
        )}
      </span>
    </Link>
  );
}
