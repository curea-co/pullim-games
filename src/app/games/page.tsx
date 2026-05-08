// /games — 게임 허브.
// `2026-05-08_game-hub.md` 본격 구현.
// 클라이언트 컴포넌트 (URL searchParams + localStorage + computeDashboardStats).

import { Suspense } from "react";
import { GameHubPage } from "@/components/game-hub/GameHubPage";

export default function GameHubRoute() {
  return (
    <Suspense fallback={null}>
      <GameHubPage />
    </Suspense>
  );
}
