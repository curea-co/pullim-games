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

/** 마지막 플레이 상대시각 — "오늘 / 어제 / N일 전". 없으면 null. */
function relativeDay(date: Date | undefined): string | null {
  if (!date) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThat = new Date(date);
  startOfThat.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThat.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 28) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
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
      aria-label="게임별 기록"
      className="flex flex-col rounded-block border border-border-hairline bg-bg-block"
    >
      {top.length > 0 ? (
        <ul className="divide-y divide-border-hairline">
          {top.map((p) => (
            <li key={p.gameId}>
              <CompactRow stat={p} />
            </li>
          ))}
        </ul>
      ) : (
        // 빈 상태도 대시보드 톤 — "기록이 쌓일 자리"임을 명시(온보딩 스플래시 대체 아님).
        <p className="px-4 py-5 text-center text-helper text-type-secondary">
          아직 풀어본 게임이 없어요.
          <br />첫 게임을 풀면 게임별 정답률·마지막 플레이가 여기에 쌓여요.
        </p>
      )}

      <Link
        href="/games"
        data-cta-priority="informational"
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
  const lastPlayed = relativeDay(stat.lastReviewAt);

  return (
    <Link
      href={`/games/${stat.gameId}`}
      data-cta-priority="informational"
      aria-label={`${stat.title} — 성공 ${stat.correct}, 실패 ${stat.failed}, 정답률 ${accuracyPct}%${
        lastPlayed ? `, 마지막 플레이 ${lastPlayed}` : ""
      }`}
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
      {/* 제목 + 마지막 플레이 시각("언제 어떤 게임") */}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-label font-medium text-type-primary">
          {stat.title}
        </span>
        {lastPlayed && (
          <span className="truncate text-helper tabular text-type-secondary">
            마지막 {lastPlayed}
          </span>
        )}
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
