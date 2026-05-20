"use client";

// "오늘의 추천" hero 카드 — 메인페이지 상단 단일 게임 추천.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 4 (hero 톤 강화).
//
// 클라이언트 마운트 후 localStorage 의 SRS 상태 로드 → 추천 알고리즘 실행.
// SSR 단계엔 placeholder (콜드 스타트 fallback) 노출.
//
// Plan E Phase 5 (2026-05-20): "다른 모드로 풀기" 보조 링크 추가.
// review-queue / time-attack / deep-recall 진입 — 학습 깊이 다른 옵션.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  loadAllSrsStates,
  recommendTodaysGame,
  type GameSrsSnapshot,
  type Recommendation,
} from "@/lib/core";
import { games } from "@/lib/games/registry";
import { Card } from "@/components/ui/card";

const FALLBACK_GAME_ID = "factorization";

const ALT_MODES: Array<{
  mode: "review-queue" | "time-attack" | "deep-recall";
  label: string;
  hint: string;
}> = [
  { mode: "review-queue", label: "오늘 카드", hint: "due-soon 우선 5개" },
  { mode: "time-attack", label: "타임어택", hint: "30초/카드" },
  { mode: "deep-recall", label: "잊혀가는 카드", hint: "잊혀가는 카드만" },
];

export function RecommendationCard() {
  const [recommendation, setRecommendation] = useState<Recommendation>({
    gameId: FALLBACK_GAME_ID,
    reason: "cold-start",
    reasonText: "처음 만나는 풀림 게임즈",
  });

  useEffect(() => {
    const snapshots: GameSrsSnapshot[] = games
      .filter((g) => g.meta.status === "available")
      .map((g) => ({
        gameId: g.meta.id,
        cardIds: [],
        states: loadAllSrsStates(g.meta.id),
      }));

    setRecommendation(recommendTodaysGame(snapshots, FALLBACK_GAME_ID));
  }, []);

  const game = games.find((g) => g.meta.id === recommendation.gameId);
  if (!game) return null;
  const Icon = game.meta.icon;

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/games/${game.meta.id}`}
        className="block rounded-block focus-visible:outline-2 focus-visible:outline-accent-positive"
        aria-label={`오늘의 추천 — ${game.meta.title}, ${recommendation.reasonText}`}
      >
        <Card className="group relative flex flex-col gap-4 rounded-block border-accent-positive/30 bg-bg-block p-5 shadow-none transition-all hover:border-accent-positive hover:shadow-block sm:p-6">
          {/* 헤더 — 라벨 + 컨텍스트 chip */}
          <header className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-positive">
              오늘의 추천
            </span>
            <span className="truncate rounded-full bg-accent-positive/10 px-2.5 py-0.5 text-helper text-accent-positive">
              {recommendation.reasonText}
            </span>
          </header>

          {/* 본문 — 큰 아이콘 + 게임명 + tagline */}
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-block bg-accent-positive/10 text-accent-positive sm:h-16 sm:w-16"
              aria-hidden="true"
            >
              <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold leading-tight text-type-primary sm:text-2xl">
                {game.meta.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-helper text-type-secondary">
                {game.meta.tagline}
              </p>
            </div>
          </div>

          {/* CTA — 지금 풀기 버튼 (hover 강조) */}
          <div className="flex items-center justify-between gap-2 rounded-block bg-accent-positive/5 px-4 py-2.5 transition-colors group-hover:bg-accent-positive/10">
            <span className="text-label font-bold text-accent-positive">
              지금 풀기
            </span>
            <ArrowRight
              className="h-4 w-4 text-accent-positive transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </Card>
      </Link>

      {/* Plan E Phase 5 — 다른 모드 보조 진입 (informational, sticky 아님).
          캐주얼 톤 유지: chip 형태, 압박 X. data-cta-priority=informational 로 UI audit 통과. */}
      <nav
        aria-label="다른 모드로 풀기"
        className="flex flex-wrap items-center gap-2"
        data-testid="recommendation-alt-modes"
      >
        <span className="text-helper text-type-secondary">다른 모드로</span>
        {ALT_MODES.map((alt) => (
          <Link
            key={alt.mode}
            href={`/games/${game.meta.id}?mode=${alt.mode}`}
            data-cta-priority="informational"
            aria-label={`${game.meta.title} — ${alt.label} 모드 (${alt.hint})`}
            className="rounded-full border border-border-hairline bg-bg-block px-3 py-1 text-helper text-type-secondary hover:border-type-primary hover:text-type-primary"
          >
            {alt.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
