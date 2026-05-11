"use client";

// / — 홈 대시보드.
// `2026-05-08_home-dashboard-redesign.md` 따름.
// 사용자 의도 = "어떤 게임을 얼마나 성공했고 얼마나 실패했고 몇 개 진행했는지".
// 게임 단위 카드에 성공·실패 절댓값을 큰 숫자로 노출.

import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { computeDashboardStats, type DashboardStats } from "@/lib/core";
import { StatCard } from "@/components/dashboard/StatCard";
import { GameStatCard } from "@/components/dashboard/GameStatCard";
import { UntouchedGamesGrid } from "@/components/dashboard/UntouchedGamesGrid";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { RecommendationCard } from "@/components/RecommendationCard";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 6 && h < 11) return "좋은 아침이에요";
  if (h >= 11 && h < 18) return "오늘 한 번 풀어볼까요";
  if (h >= 18 && h < 24) return "오늘도 수고했어요";
  return "늦은 시간 풀이도 좋아요";
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hello, setHello] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = await computeDashboardStats();
      if (!cancelled) setStats(s);
    }
    load();
    setHello(greeting(new Date()));

    function onVisibility() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-type-secondary">
          홈
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-type-primary">
          {hello || "안녕하세요"}
        </h1>
        {stats && stats.gamesPlayed > 0 && (
          <p className="mt-1.5 text-label text-type-secondary tabular">
            {stats.gamesPlayed}개 게임을 만났어요
          </p>
        )}
      </header>

      {!stats ? (
        <DashboardSkeleton />
      ) : stats.gamesPlayed === 0 ? (
        <EmptyDashboard />
      ) : (
        <Dashboard stats={stats} />
      )}
    </main>
  );
}

function Dashboard({ stats }: { stats: DashboardStats }) {
  // 풀어본 게임 — attempts 내림차순 (가장 많이 푼 게임이 위)
  const playedStats = stats.perGame
    .filter((p) => p.cardsTouched > 0)
    .sort((a, b) => b.attempts - a.attempts);
  // 미진행 게임
  const untouched = stats.perGame.filter((p) => p.cardsTouched === 0);

  return (
    <>
      {/* KPI 2-card — 성공·실패 절댓값 */}
      <section aria-label="핵심 지표" className="grid grid-cols-2 gap-3">
        <StatCard
          icon={CheckCircle2}
          label="성공"
          value={`${stats.totalCorrect}번`}
          helper={
            stats.todayAttempts > 0
              ? `오늘 ${stats.todayAttempts}장 풀었어요`
              : "오늘은 아직 시작 전"
          }
        />
        <StatCard
          icon={XCircle}
          label="실패"
          value={`${stats.totalLapses}번`}
          helper={
            stats.dueSoonCount > 0
              ? `곧 다시 만날 ${stats.dueSoonCount}장`
              : "다시 만날 카드 없음"
          }
        />
      </section>

      {/* 게임별 성과 */}
      <section aria-label="게임별 성과" className="flex flex-col gap-3">
        <header>
          <h2 className="text-label font-bold text-type-primary">
            게임별 성과
          </h2>
          <p className="text-helper text-type-secondary">
            {playedStats.length}개 게임을 풀어봤어요
          </p>
        </header>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {playedStats.map((p) => (
            <li key={p.gameId}>
              <GameStatCard stat={p} />
            </li>
          ))}
        </ul>
      </section>

      {/* 미진행 게임 그리드 */}
      <UntouchedGamesGrid games={untouched} />

      {/* 오늘의 추천 — 화면 하단 */}
      <Suspense fallback={null}>
        <RecommendationCard />
      </Suspense>

      {/* 외재 보상 회피 안내 — 작게 */}
      <p className="text-helper text-type-secondary">
        풀림 게임즈는 점수·랭크·뱃지 없이 진행 자체를 보여드려요.
      </p>
    </>
  );
}
