// ⭐ 풀림 게임즈 — 게임 레지스트리 (public API).
//
// 실제 데이터는 registry.generated.ts 가 보유 (scripts/generate-registry.ts 가 자동 작성).
// 이 파일은 generated 를 re-export 하며 조회 헬퍼 추가.
//
// 새 게임 추가 절차 (중앙 파일 수정 0회):
//   1. games/<id>/manifest.ts 작성 (default export = GameManifest)
//   2. games/<id>/component.tsx 작성
//   3. 끝. predev/prebuild 훅이 registry.generated.ts 자동 갱신.
//
// 상세: proc/plan/2026-05-08_parallel-game-architecture.md

import { games } from "./registry.generated";
import type { GameManifest } from "./types";

export { games };

/**
 * 발견(discovery) 표면용 게임 목록 — 허브 그리드(`GameHubPage`)·오늘의 추천 후보 선택
 * (`RecommendationCard`)·about 쇼케이스·stats `perGame` 이 사용. `stage:"high"` 보관 게임을
 * 제외하는 필터지만, **타겟이 중·고등 둘 다라 현재 보관 게임이 0** → `visibleGames === games`
 * (전 게임 노출). 향후 "학년별 게임 제공" 필터로 재설계 예정([[GameMeta.stage]]).
 * 근거: proc/plan/2026-06-26_middle-high-target.md.
 */
export const visibleGames: GameManifest[] = games.filter(
  (g) => g.meta.stage !== "high",
);

/**
 * gameId 로 게임 매니페스트 조회. 없으면 undefined.
 * /games/[gameId] 동적 라우트에서 사용.
 */
export function getGameById(gameId: string): GameManifest | undefined {
  return games.find((g) => g.meta.id === gameId);
}

/**
 * 등록된 모든 gameId. Next.js generateStaticParams() 등에 사용.
 */
export function getAllGameIds(): string[] {
  return games.map((g) => g.meta.id);
}
