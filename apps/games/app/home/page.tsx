"use client";

// /home — 홈 대시보드 (구 `/`, 2026-06-01 랜딩 도입으로 이전). `/` 는 랜딩 히어로.
// 로그인/게스트 기록 보유자는 여기(/home)로 진입.
// 게임별 성과(옛 GameStatCard 그리드) + 미진행 게임 그리드는 CompactActivity 한 블록으로 통합
// (2026-05-27) — 슬림 row + 한 줄 게임 허브 CTA, 정보 밀도 향상.

import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { computeDashboardStats, type DashboardStats } from "@/lib/core";
import { StatCard } from "@/components/dashboard/StatCard";
import { CompactActivity } from "@/components/dashboard/CompactActivity";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardStatusRow } from "@/components/dashboard/DashboardStatusRow";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { RecommendationCard } from "@/components/RecommendationCard";
import { RequireIdentity } from "@/components/auth/RequireIdentity";
import { GradePrompt } from "@/components/auth/GradePrompt";

// 입구 게이트(arcade 모델) — 신원(게스트/회원) 없으면 랜딩으로. plan: 2026-06-01_arcade-entry-model.md.
export default function HomePage() {
  return (
    <RequireIdentity>
      <HomeDashboard />
      {/* pullim 모드 회원 학년 미보유 시 수집 모달(dormant — env 미설정 시 no-op). */}
      <GradePrompt />
    </RequireIdentity>
  );
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 6 && h < 11) return "좋은 아침이에요";
  if (h >= 11 && h < 18) return "오늘 한 번 풀어볼까요";
  if (h >= 18 && h < 24) return "오늘도 수고했어요";
  return "늦은 시간 풀이도 좋아요";
}

function HomeDashboard() {
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
    <main
      data-puds-page="student-home"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8 lg:px-8"
    >
      <header>
        <p className="puds-page-eyebrow uppercase">홈</p>
        <h1 className="puds-page-title mt-1">
          {hello || "안녕하세요"}
        </h1>
        {stats && (
          <p className="puds-page-meta mt-1.5 tabular">
            {stats.gamesPlayed > 0
              ? `${stats.gamesPlayed}개 게임을 만났어요`
              : "첫 게임을 풀면 여기에 기록이 쌓여요"}
          </p>
        )}
      </header>

      {/* 홈은 기록 유무와 무관하게 항상 대시보드 골격을 렌더한다 — 빈 상태도 온보딩 스플래시가
          아니라 "채워지길 기다리는 대시보드"로 보인다(0 값 KPI·상태 칩 + 추천 콜드스타트가 첫
          게임 안내를 담당). plan: 2026-07-05_home-dashboard-always-on.md. */}
      {!stats ? <DashboardSkeleton /> : <Dashboard stats={stats} />}
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

  const isFirstTime = stats.gamesPlayed === 0;

  // 행렬 정렬 우선 — 모든 영역이 전체 폭 row stack. 행 사이 빈 공간 X.
  // 와이드에서 grid 분할은 row 내부에서만 (chip·KPI·게임별).
  return (
    <div className="flex flex-col gap-5">
      {/* 첫 사용자 — 아직 기록 없음 안내. 대시보드 골격은 그대로 두고 배너로만 맥락 제공
          (온보딩 스플래시로 대체하지 않는다 — 홈은 항상 대시보드). */}
      {isFirstTime && (
        <p className="rounded-block border border-border-hairline bg-bg-block px-4 py-3 text-helper text-type-secondary">
          아직 풀어본 게임이 없어요. 아래 추천 게임을 한 판 풀면 정답률·활동·연속이 여기에
          쌓여요.
        </p>
      )}

      {/* 오늘의 추천 — full-width hero */}
      <section aria-label="오늘의 추천">
        <Suspense fallback={null}>
          <RecommendationCard />
        </Suspense>
      </section>

      {/* status 3 chip — 한 row 가로 배치 (모바일도 grid-cols-3) */}
      <section aria-label="학습 상태">
        <DashboardStatusRow stats={stats} />
      </section>

      {/* KPI 2-card — full-width 2열 */}
      <section
        aria-label="핵심 지표"
        className="grid grid-cols-2 gap-3"
      >
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

      {/* 활동 히트맵 — 전체 폭, 단일 row 합산 */}
      {playedStats.length > 0 && (
        <ActivityHeatmap playedStats={playedStats} />
      )}

      {/* 게임 활동 — 슬림 row 5개 + 한 줄 게임 허브 CTA (구 GameStatCard + UntouchedGamesGrid 통합) */}
      <CompactActivity
        played={playedStats}
        untouchedCount={untouched.length}
        totalGames={playedStats.length + untouched.length}
      />

      {/* 외재 보상 회피 안내 */}
      <p className="text-helper text-type-secondary">
        풀림 게임즈는 점수·랭크·뱃지 없이 진행 자체를 보여드려요.
      </p>
    </div>
  );
}
