"use client";

// / — 홈 대시보드.
// `2026-05-08_home-dashboard.md` 따름.
//
// CSR only — localStorage 기반 통계. SSR skeleton → hydration 후 실제 콘텐츠.
// visibility 동기화로 게임 플레이 후 복귀 시 통계 갱신.

import { Suspense, useEffect, useState } from "react";
import { Layers, Target, TrendingUp } from "lucide-react";
import { computeDashboardStats, type DashboardStats } from "@/lib/core";
import { StatCard } from "@/components/dashboard/StatCard";
import { GameProgressRow } from "@/components/dashboard/GameProgressRow";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SectionHeading } from "@/components/SectionHeading";

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
      if (document.visibilityState === "visible") {
        load();
      }
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
            {stats.gamesPlayed}개 게임에서 {stats.totalAttempts}장 풀었어요
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
  const accuracyPct = Math.round(stats.accuracy * 100);
  const playedStats = stats.perGame.filter((p) => p.cardsTouched > 0);

  return (
    <>
      {/* KPI 3-card */}
      <section
        aria-label="핵심 지표"
        className="grid grid-cols-3 gap-3"
      >
        <StatCard
          icon={Layers}
          label="진행한 게임"
          value={stats.gamesPlayed}
          helper={`전체 ${stats.perGame.length}개 중`}
        />
        <StatCard
          icon={Target}
          label="정답률"
          value={`${accuracyPct}%`}
          helper={
            stats.totalAttempts > 0
              ? `${stats.totalCorrect}/${stats.totalAttempts}장`
              : "아직 없어요"
          }
        />
        <StatCard
          icon={TrendingUp}
          label="오늘 풀이"
          value={stats.todayAttempts}
          helper={
            stats.dueSoonCount > 0
              ? `곧 만날 ${stats.dueSoonCount}장`
              : "오늘 새 카드"
          }
        />
      </section>

      {/* 오늘의 추천 */}
      <Suspense fallback={null}>
        <RecommendationCard />
      </Suspense>

      {/* 게임별 진행 */}
      <section aria-label="게임별 진행">
        <SectionHeading
          title="게임별 진행"
          description={`${playedStats.length}개 풀어봤어요`}
        />
        <ul className="flex flex-col gap-2">
          {playedStats.map((p) => (
            <li key={p.gameId}>
              <GameProgressRow stat={p} />
            </li>
          ))}
        </ul>
      </section>

      {/* 더 풀어볼 게임 안내 */}
      {playedStats.length < stats.perGame.length && (
        <section
          aria-label="안내"
          className="rounded-block border border-border-hairline bg-bg-block p-4 text-helper text-type-secondary"
        >
          아직 만나지 못한 게임이{" "}
          <span className="font-bold text-type-primary tabular">
            {stats.perGame.length - playedStats.length}개
          </span>
          {" "}있어요. 게임 허브에서 만나볼 수 있어요.
        </section>
      )}

      {/* 외재 보상 회피 안내 — 작게 */}
      <p className="text-helper text-type-secondary">
        풀림 게임즈는 점수·랭크·뱃지 없이 진행 자체를 보여드려요.
      </p>
    </>
  );
}
