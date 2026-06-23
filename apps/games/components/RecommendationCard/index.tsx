"use client";

// "오늘의 추천" hero 카드 — 메인페이지 상단 단일 게임 추천.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 4 (hero 톤 강화).
//
// 클라이언트 마운트 후 localStorage 의 SRS 상태 로드 → 추천 알고리즘 실행.
// SSR 단계엔 placeholder (콜드 스타트 fallback) 노출.
//
// Plan E Phase 5 (2026-05-20): "다른 모드로 풀기" 보조 링크 추가.
// review-queue / time-attack / deep-recall 진입 — 학습 깊이 다른 옵션.
//
// PR #92 Codex round 1 fix:
//   - 비지원 게임(직접 게임 12종)에 time-attack/deep-recall 진입점 노출 차단.
//     supported 여부는 isModeSupportedFor(gameId, mode) 로 판정.
//   - chip 디자인 SPEC 08.10/08.12 정합: rounded-button + px-4 py-2 (44×44 터치 영역).
//
// PR #92 Codex round 2 fix:
//   - chip 가로 너비 44px 보장 — min-w-[44px] 추가 (label 변경 회귀 차단).
//   - review-queue 는 모든 게임 지원이므로 supportedAlts 가 비지 않음(직접 게임도 최소 1개).
//     실제로 nav 는 어떤 추천에서도 렌더링됨 — 회귀 회로 e2e 가 확실히 잡게끔 테스트 보강.
//
// PR #92 Codex round 6 fix:
//   - alt-mode chip 들에 SPEC 08.10 focus ring 명시적 부여
//     (focus-visible:outline-2 focus-visible:outline-accent-positive focus-visible:outline-offset-2).
//   - 전역 :focus-visible 룰이 있으나 Link 컴포넌트 anchor 에 명시적으로도 박아
//     키보드 Tab 탐색 시 chip 외곽 ring 이 안정적으로 보이도록 한다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  loadAllSrsStates,
  recommendTodaysGame,
  type GameMode,
  type GameSrsSnapshot,
  type Recommendation,
} from "@/lib/core";
import { games, visibleGames } from "@/lib/games/registry";
import { isModeSupportedFor } from "@/lib/games/supported-modes";
import { Card } from "@/components/ui/card";

const FALLBACK_GAME_ID = "factorization";

const ALT_MODES: Array<{
  mode: Exclude<GameMode, "default">;
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
    // 추천은 **발견(discovery) 표면**이다(GameMeta.stage 계약 = 허브·추천·about). 따라서 추천
    // 대상 선택/노출은 `visibleGames` 로 제한 — 보관(stage:"high") 게임을 직접 URL 로 한 번
    // 플레이했다고 /home·/games 추천 히어로로 그 게임을 다시 밀지 않는다(Codex #125 R5).
    // (학습 상태 magnitude 집계 — dashboard/stats·sync — 는 전체 games 유지: 단일 백본 불변.)
    const snapshots: GameSrsSnapshot[] = visibleGames
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
          캐주얼 톤 유지: chip 형태, 압박 X. data-cta-priority=informational 로 UI audit 통과.
          PR #92 Codex round 1 fix:
            - 지원 게임만 노출 (isModeSupportedFor). 비지원 모드는 SR-only 안내로 대체.
            - chip 계약(SPEC 08.10/08.12): rounded-button + px-4 py-2 (44×44 터치). */}
      {(() => {
        const supportedAlts = ALT_MODES.filter((alt) =>
          isModeSupportedFor(game.meta.id, alt.mode),
        );
        if (supportedAlts.length === 0) {
          // 직접 게임 — TimeAttackTimer/DeepRecallEmpty 미통합. 진입점 노출 X.
          // 시각 노이즈 차단 위해 nav 자체를 렌더 X (a11y 영향 없음 — 다른 진입은 hero CTA).
          return null;
        }
        return (
          <nav
            aria-label="다른 모드로 풀기"
            className="flex flex-wrap items-center gap-2"
            data-testid="recommendation-alt-modes"
          >
            <span className="text-helper text-type-secondary">다른 모드로</span>
            {supportedAlts.map((alt) => (
              <Link
                key={alt.mode}
                href={`/games/${game.meta.id}?mode=${alt.mode}`}
                data-cta-priority="informational"
                data-mode={alt.mode}
                aria-label={`${game.meta.title} — ${alt.label} 모드 (${alt.hint})`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-button border border-border-hairline bg-bg-block px-4 py-2 text-helper text-type-secondary hover:border-type-primary hover:text-type-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-positive"
              >
                {alt.label}
              </Link>
            ))}
          </nav>
        );
      })()}
    </div>
  );
}
