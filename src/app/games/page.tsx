// /games — 게임 허브 (placeholder, V0.5 game-hub plan 이 본격 구현).
//
// 현재는 기존 메인페이지의 카드 그리드 + 추천 + 필터 콘텐츠를 그대로 옮긴 형태.
// `2026-05-08_game-hub.md` Phase G1~G5 에서 4 뷰 전환·6축 필터·나만의 게임 영역 추가.

import { Suspense } from "react";
import { GameCard } from "@/components/GameCard";
import { SectionHeading } from "@/components/SectionHeading";
import { InfoNote } from "@/components/InfoNote";
import { RecommendationCard } from "@/components/RecommendationCard";
import { FilterChips } from "@/components/FilterChips";
import { games } from "@/lib/games/registry";
import {
  applyFilter,
  deriveSubjectOptions,
  FILTER_THRESHOLD_MECHANIC,
  FILTER_THRESHOLD_SUBJECT,
  MECHANIC_OPTIONS,
} from "@/lib/games/filter";

interface SearchParams {
  subject?: string;
  mechanic?: string;
}

interface GameHubPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function GameHubPage({ searchParams }: GameHubPageProps) {
  const params = await searchParams;

  const totalGameCount = games.length;
  const subjectFilterActive = totalGameCount >= FILTER_THRESHOLD_SUBJECT;
  const mechanicFilterActive = totalGameCount >= FILTER_THRESHOLD_MECHANIC;

  const filtered = applyFilter(games, {
    subject: subjectFilterActive ? params.subject : undefined,
    mechanic: mechanicFilterActive ? params.mechanic : undefined,
  });

  const available = filtered.filter((g) => g.meta.status === "available");
  const comingSoon = filtered.filter((g) => g.meta.status === "coming-soon");

  const hasAnyAvailableInRegistry = games.some(
    (g) => g.meta.status === "available",
  );

  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-type-secondary">
          게임 허브
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-type-primary">
          오늘은 어떤 게임으로 시작할까요?
        </h1>
        <p className="mt-1.5 text-label text-type-secondary">
          {available.length}개의 게임을 풀 수 있어요
        </p>
      </header>

      {hasAnyAvailableInRegistry && (
        <Suspense fallback={null}>
          <RecommendationCard />
        </Suspense>
      )}

      {subjectFilterActive && (
        <Suspense fallback={null}>
          <FilterChips
            paramKey="subject"
            options={deriveSubjectOptions(games)}
            ariaLabel="과목 필터"
          />
        </Suspense>
      )}
      {mechanicFilterActive && (
        <Suspense fallback={null}>
          <FilterChips
            paramKey="mechanic"
            options={MECHANIC_OPTIONS}
            ariaLabel="메커닉 필터"
          />
        </Suspense>
      )}

      <section>
        <SectionHeading
          title="플레이할 수 있는 게임"
          description={`${available.length}개의 게임이 준비됐어요`}
        />
        {available.length === 0 ? (
          <p className="rounded-block border border-border-hairline bg-bg-block p-5 text-label text-type-secondary">
            이 조합으로는 게임이 없어요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {available.map((g) => (
              <GameCard key={g.meta.id} meta={g.meta} />
            ))}
          </div>
        )}
      </section>

      {comingSoon.length > 0 && (
        <section>
          <SectionHeading
            title="곧 만나요"
            description={`준비 중인 ${comingSoon.length}개`}
          />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {comingSoon.map((g) => (
              <GameCard key={g.meta.id} meta={g.meta} />
            ))}
          </div>
        </section>
      )}

      <InfoNote label="학습 데이터">
        어떤 게임을 풀어도 같은 카드 풀에 쌓여요. 1주 후, 그 개념을 더 단단하게
        다시 만나요.
      </InfoNote>
    </main>
  );
}
