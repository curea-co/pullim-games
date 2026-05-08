// / 메인페이지 — 게임 picker.
// V0.3: 추천 카드 (FSRS 기반) + 필터 칩 (게임 수 임계 도달 시 활성).
// SPEC §03.3 IA + Plan F §7.

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

interface HomePageProps {
  searchParams: Promise<SearchParams>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  // 필터 활성 임계 (Plan F §7.2)
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
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-6 px-6 py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-type-secondary">
          풀림 게임즈
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-type-primary">
          푸는 게 곧 배우는 거예요.
        </h1>
        <p className="mt-1.5 text-label text-type-secondary">
          오늘은 어떤 게임으로 시작할까요?
        </p>
      </header>

      {/* 오늘의 추천 카드 — 활성 게임 1개 이상 있을 때만 */}
      {hasAnyAvailableInRegistry && (
        <Suspense fallback={null}>
          <RecommendationCard />
        </Suspense>
      )}

      {/* 필터 칩 — 임계 도달 시 활성 */}
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

      {/* 활성 게임 그리드 */}
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
