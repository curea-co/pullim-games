// 영역 배치 vs 정답 region-by-region 비교.

import type { Region } from "../schema";

export interface HotspotResult {
  allCorrect: boolean;
  correctCount: number;
  totalCount: number;
  perRegion: boolean[];
}

/**
 * @param placements regions 와 같은 순서로 배치된 cardId. null = 미배치.
 */
export function checkHotspot(
  placements: (string | null)[],
  regions: Region[],
): HotspotResult {
  if (placements.length !== regions.length) {
    throw new Error(
      `[image-hotspot] placements length ${placements.length} != regions length ${regions.length}`,
    );
  }
  const perRegion = regions.map((r, i) => placements[i] === r.correctCardId);
  const correctCount = perRegion.filter(Boolean).length;
  return {
    allCorrect: correctCount === regions.length,
    correctCount,
    totalCount: regions.length,
    perRegion,
  };
}
