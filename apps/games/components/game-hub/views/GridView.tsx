// 그리드 뷰 — 큼지막한 카드 2-col (모바일 1-col).
// 기존 GameCard 재사용 + 진행도 바 오버레이.

import { GameCard } from "@/components/GameCard";
import type { GameManifest } from "@/lib/games/types";
import type { ProgressLookup } from "@/lib/games/filter";

interface Props {
  games: GameManifest[];
  progress?: ProgressLookup;
}

export function GridView({ games }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {games.map((g) => (
        <GameCard key={g.meta.id} meta={g.meta} />
      ))}
    </div>
  );
}
