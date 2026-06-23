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
 * 사용자 노출용 게임 목록 — 보관(`stage:"high"`, 고등 전용) 제외.
 * **발견(discovery) 표면만** 이 목록을 쓴다 — 허브 그리드·오늘의 추천·about 쇼케이스.
 * 라우팅(`getGameById`/`getAllGameIds`)·custom 관리·**학습 집계(대시보드 stats)**는
 * 전체 `games` 유지 — 보관 게임도 직접 URL 진입·플레이가 살아있어(삭제 아님) 그
 * 학습 기록은 총계에 포함돼야 한다(Codex #125).
 * 근거: proc/plan/2026-06-23_middle-school-repositioning.md.
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
