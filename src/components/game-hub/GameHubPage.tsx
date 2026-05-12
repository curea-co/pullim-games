"use client";

// 게임 허브 메인 컴포넌트 — `2026-05-08_game-hub.md` 따름.
// 4 뷰 토글 + 6축 필터 + URL sync + 나만의 게임 영역.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  applyFilter,
  buildProgressLookup,
  deriveSubjectOptions,
  type FilterState,
  type ProgressLookup,
} from "@/lib/games/filter";
import { games } from "@/lib/games/registry";
import {
  computeDashboardStats,
  type DashboardStats,
} from "@/lib/core";
import { ViewToggle, type GameHubView } from "./ViewToggle";
import { GridView } from "./views/GridView";
import { ListView } from "./views/ListView";
import { PreviewView } from "./views/PreviewView";
import { TableView } from "./views/TableView";
import { ThumbnailView } from "./views/ThumbnailView";
import { FilterContents } from "./FilterContents";
import { FilterSheet } from "./FilterSheet";
import { CustomGamesSection } from "./CustomGamesSection";
import { RecommendationCard } from "@/components/RecommendationCard";

const VIEW_STORAGE_KEY = "pullim-games:hub:view";
const VALID_VIEWS: GameHubView[] = [
  "grid",
  "list",
  "table",
  "thumbnail",
  "preview",
];

function parseView(raw: string | null): GameHubView {
  return VALID_VIEWS.includes(raw as GameHubView)
    ? (raw as GameHubView)
    : "grid";
}

function readFilterFromQuery(params: URLSearchParams): FilterState {
  return {
    subject: params.get("subject") ?? undefined,
    mechanic: (params.get("mechanic") as FilterState["mechanic"]) ?? undefined,
    depth: (params.get("depth") as FilterState["depth"]) ?? undefined,
    time: (params.get("time") as FilterState["time"]) ?? undefined,
    progress:
      (params.get("progress") as FilterState["progress"]) ?? undefined,
    search: params.get("search") ?? undefined,
  };
}

function writeFilterToQuery(state: FilterState): string {
  const next = new URLSearchParams();
  if (state.subject && state.subject !== "all") next.set("subject", state.subject);
  if (state.mechanic && state.mechanic !== "all") next.set("mechanic", state.mechanic);
  if (state.depth && state.depth !== "all") next.set("depth", state.depth);
  if (state.time && state.time !== "all") next.set("time", state.time);
  if (state.progress && state.progress !== "all") next.set("progress", state.progress);
  if (state.search) next.set("search", state.search);
  return next.toString();
}

function countApplied(state: FilterState): number {
  let n = 0;
  if (state.subject && state.subject !== "all") n += 1;
  if (state.mechanic && state.mechanic !== "all") n += 1;
  if (state.depth && state.depth !== "all") n += 1;
  if (state.time && state.time !== "all") n += 1;
  if (state.progress && state.progress !== "all") n += 1;
  if (state.search) n += 1;
  return n;
}

export function GameHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 뷰 상태 — URL ?view= 우선, 없으면 localStorage, 없으면 preview (첫 진입 default, design-audit F8)
  const [view, setView] = useState<GameHubView>("preview");
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // 마운트 시 뷰 복원
  useEffect(() => {
    const fromUrl = searchParams.get("view");
    if (fromUrl && VALID_VIEWS.includes(fromUrl as GameHubView)) {
      setView(fromUrl as GameHubView);
      return;
    }
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored) setView(parseView(stored));
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  // 통계 로드 (진행도 분류용) — visibility 동기화
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = await computeDashboardStats();
      if (!cancelled) setStats(s);
    }
    load();
    function onVisibility() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function handleViewChange(next: GameHubView) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    // URL 에는 기록하지 않음 — localStorage 만으로 충분 (필터는 URL)
  }

  // 필터 상태 — URL 에서 읽어옴
  const filter = useMemo<FilterState>(() => {
    return readFilterFromQuery(new URLSearchParams(searchParams.toString()));
  }, [searchParams]);

  function handleFilterChange(next: FilterState) {
    const qs = writeFilterToQuery(next);
    router.replace(qs ? `/games?${qs}` : "/games", { scroll: false });
  }

  function handleResetFilter() {
    router.replace("/games", { scroll: false });
  }

  const progressLookup: ProgressLookup | undefined = stats
    ? buildProgressLookup(stats.perGame)
    : undefined;

  // 메인 그리드는 official 만 (custom 은 CustomGamesSection 분리)
  const officialGames = useMemo(
    () => games.filter((g) => (g.meta.kind ?? "official") === "official"),
    [],
  );

  const filtered = useMemo(
    () => applyFilter(officialGames, filter, progressLookup),
    [officialGames, filter, progressLookup],
  );

  const subjectOptions = deriveSubjectOptions(officialGames);
  const appliedCount = countApplied(filter);

  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-type-secondary">
            게임 허브
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-type-primary">
            오늘은 어떤 게임으로 시작할까요?
          </h1>
          <p className="mt-1.5 text-label text-type-secondary tabular">
            {officialGames.length}개 중 {filtered.length}개 노출
            {appliedCount > 0 && ` · 필터 ${appliedCount}개 적용`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 모바일/태블릿 — 필터 sheet */}
          <div className="lg:hidden">
            <FilterSheet
              state={filter}
              onChange={handleFilterChange}
              subjectOptions={subjectOptions}
              onReset={handleResetFilter}
              appliedCount={appliedCount}
            />
          </div>
          <ViewToggle value={view} onChange={handleViewChange} />
        </div>
      </header>

      {/* 데스크탑 2-col */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* 사이드 필터 (lg+) */}
        <aside className="hidden shrink-0 lg:block lg:w-[220px]">
          <div className="sticky top-12">
            <FilterContents
              state={filter}
              onChange={handleFilterChange}
              subjectOptions={subjectOptions}
              onReset={handleResetFilter}
            />
          </div>
        </aside>

        {/* 본문 */}
        <div className="flex flex-1 flex-col gap-6">
          {/* 추천 카드 */}
          <Suspense fallback={null}>
            <RecommendationCard />
          </Suspense>

          {/* 결과 */}
          {filtered.length === 0 ? (
            <div className="rounded-block border border-border-hairline bg-bg-block p-6 text-center">
              <p className="text-label text-type-secondary">
                이 조합으로는 게임이 없어요.
              </p>
              <button
                type="button"
                onClick={handleResetFilter}
                className="mt-3 rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper text-type-primary hover:bg-accent-positive/10"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <ResultView
              view={view}
              games={filtered}
              progress={progressLookup}
              perGame={stats?.perGame}
            />
          )}

          {/* 나만의 게임 */}
          <CustomGamesSection />
        </div>
      </div>
    </main>
  );
}

interface ResultViewProps {
  view: GameHubView;
  games: typeof games;
  progress?: ProgressLookup;
  perGame?: DashboardStats["perGame"];
}

function ResultView({ view, games, progress, perGame }: ResultViewProps) {
  switch (view) {
    case "grid":
      return <GridView games={games} progress={progress} />;
    case "list":
      return <ListView games={games} progress={progress} perGame={perGame} />;
    case "table":
      return <TableView games={games} progress={progress} perGame={perGame} />;
    case "thumbnail":
      return <ThumbnailView games={games} progress={progress} />;
    case "preview":
      return <PreviewView games={games} progress={progress} />;
  }
}
