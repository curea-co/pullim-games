// 테이블 뷰 — 정보 밀도 높음, 모바일 가로 스크롤.

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

const MECHANIC_LABEL: Record<string, string> = {
  manipulation: "조작",
  sorting: "정렬",
  matching: "매칭",
  "multiple-choice": "객관식",
  typing: "타이핑",
};

const DEPTH_LABEL: Record<string, string> = {
  shallow: "얕음",
  medium: "중간",
  deep: "깊음",
};

export function TableView({ games, perGame }: Props) {
  const statByGame = new Map(perGame?.map((p) => [p.gameId, p]) ?? []);

  return (
    <div className="overflow-x-auto rounded-block border border-border-hairline bg-bg-block">
      <table className="w-full min-w-[720px] border-collapse text-helper text-type-primary">
        <thead className="border-b border-border-hairline bg-pullim-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-bold text-type-secondary">제목</th>
            <th className="px-3 py-2 text-left font-bold text-type-secondary">과목·단원</th>
            <th className="px-3 py-2 text-left font-bold text-type-secondary">메커닉</th>
            <th className="px-3 py-2 text-left font-bold text-type-secondary">깊이</th>
            <th className="px-3 py-2 text-right font-bold text-type-secondary">시간</th>
            <th className="px-3 py-2 text-right font-bold text-type-secondary">진행</th>
            <th className="px-3 py-2 text-right font-bold text-type-secondary">정답률</th>
            <th className="px-3 py-2 text-right font-bold text-type-secondary"></th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const Icon = g.meta.icon;
            const stat = statByGame.get(g.meta.id);
            const isAvailable = g.meta.status === "available";
            const accuracyPct =
              stat && stat.attempts > 0
                ? Math.round(stat.accuracy * 100) + "%"
                : "—";
            return (
              <tr
                key={g.meta.id}
                className="border-b border-border-hairline last:border-b-0 hover:bg-pullim-slate-50/60"
              >
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-type-secondary" strokeWidth={2} />
                    <span className="font-bold text-type-primary">{g.meta.title}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-type-secondary">
                  {g.meta.subject} · {g.meta.unit}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-type-secondary">
                  {MECHANIC_LABEL[g.meta.mechanic] ?? g.meta.mechanic}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-type-secondary">
                  {DEPTH_LABEL[g.meta.retrievalDepth] ?? g.meta.retrievalDepth}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular text-type-secondary">
                  {g.meta.estimatedMinutes}분
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular text-type-secondary">
                  {stat ? `${stat.cardsTouched}/${stat.cardsTotal}` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular text-type-secondary">
                  {accuracyPct}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  {isAvailable ? (
                    <Link
                      href={`/games/${g.meta.id}`}
                      className="inline-flex items-center gap-1 rounded-button border border-type-primary bg-bg-block px-2.5 py-1 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
                      aria-label={`${g.meta.title} 시작`}
                    >
                      시작 <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-type-secondary/60">
                      <Lock className="h-3 w-3" /> 잠금
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
