// / 메인페이지 — 게임 picker.
// 레이아웃 패턴 출처: pullim-study-demo `(student)/page.tsx` 차용.
// 색·톤·서비스 정체성은 풀림 게임즈 SPEC §07/§08 따름.

import { GameCard } from "@/components/GameCard";
import { SectionHeading } from "@/components/SectionHeading";
import { InfoNote } from "@/components/InfoNote";
import { games } from "@/lib/games/registry";

export default function HomePage() {
  const available = games.filter((g) => g.meta.status === "available");
  const comingSoon = games.filter((g) => g.meta.status === "coming-soon");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-6 px-6 py-10">
      {/* 헤더 — 작은 메타 라벨 + 굵은 제목 + 부제 (해요체) */}
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

      {/* 활성 게임 섹션 */}
      <section>
        <SectionHeading
          title="플레이할 수 있는 게임"
          description={`${available.length}개의 게임이 준비됐어요`}
        />
        {available.length === 0 ? (
          <p className="rounded-block border border-border-hairline bg-bg-block p-5 text-label text-type-secondary">
            아직 등록된 게임이 없어요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {available.map((g) => (
              <GameCard key={g.meta.id} meta={g.meta} />
            ))}
          </div>
        )}
      </section>

      {/* 준비 중 게임 섹션 — 있을 때만 */}
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

      {/* 하단 정보 노트 — 단일 백본 인사이트 (FSRS 공유) */}
      <InfoNote label="학습 데이터">
        어떤 게임을 풀어도 같은 카드 풀에 쌓여요. 1주 후, 그 개념을 더 단단하게
        다시 만나요.
      </InfoNote>
    </main>
  );
}
