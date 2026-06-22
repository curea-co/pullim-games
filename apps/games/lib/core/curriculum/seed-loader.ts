// Seed 콘텐츠 로더 — V1.5 부터 catalog 의 seedRef 로만 진입.
// V1 의 listSeedSubjects() (2-depth picker 데이터 소스) 는 통합 picker 도입과 함께 제거.

import factorizationData from "./seed/math/factorization.json";
import type { CurriculumSeed } from "./types";

const SEEDS: CurriculumSeed[] = [factorizationData as CurriculumSeed];

const SEED_BY_KEY = new Map<string, CurriculumSeed>(
  SEEDS.map((s) => [seedKey(s.subjectId, s.unitId), s]),
);

function seedKey(subjectId: string, unitId: string): string {
  return `${subjectId}::${unitId}`;
}

/** subjectId + unitId 로 seed 찾기. 없으면 undefined. */
export function findSeed(
  subjectId: string,
  unitId: string,
): CurriculumSeed | undefined {
  return SEED_BY_KEY.get(seedKey(subjectId, unitId));
}
