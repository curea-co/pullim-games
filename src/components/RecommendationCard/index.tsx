"use client";

// "오늘의 추천" 카드 — 메인페이지 상단 단일 게임 추천.
// 클라이언트 마운트 후 localStorage 의 SRS 상태 로드 → 추천 알고리즘 실행.
// SSR 단계엔 placeholder (콜드 스타트 fallback) 노출.

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

const FALLBACK_GAME_ID = "factorization";

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
        cardIds: [], // V0.3: 실제 카드 ID 목록은 게임별 content 모듈에서 노출 필요. 일단 빈 배열로 — recommendation 알고리즘은 cardIds 기반 new-cards 판정만 영향.
        states: loadAllSrsStates(g.meta.id),
      }));

    setRecommendation(recommendTodaysGame(snapshots, FALLBACK_GAME_ID));
  }, []);

  const game = games.find((g) => g.meta.id === recommendation.gameId);
  if (!game) return null;
  const Icon = game.meta.icon;

  return (
    <Link
      href={`/games/${game.meta.id}`}
      className="block rounded-block focus-visible:outline-2 focus-visible:outline-accent-positive"
      aria-label={`오늘의 추천 — ${game.meta.title}, ${recommendation.reasonText}`}
    >
      <article className="group relative flex flex-col gap-3 rounded-block border border-type-primary bg-bg-block p-6 transition-shadow hover:shadow-block">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-type-secondary">
            오늘의 추천
          </span>
          <ArrowRight
            className="h-4 w-4 text-type-secondary/40 transition-colors group-hover:text-type-primary"
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-button bg-accent-positive/10 text-type-primary"
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-display !text-xl text-type-primary">
              {game.meta.title}
            </h2>
            <p className="mt-0.5 text-helper text-type-secondary">
              {recommendation.reasonText}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
