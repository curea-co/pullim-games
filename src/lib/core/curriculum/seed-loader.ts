// Seed 카탈로그 로더 — V1 은 정적 import (단일 단원).
// V2 에서 추가 단원 늘어나면 같은 패턴으로 등록.
// `2026-05-08_management-auto-generation.md` §3.1 따름.

import factorizationData from "./seed/math/factorization.json";
import type { CurriculumSeed, SeedSubjectMeta } from "./types";

const SEEDS: CurriculumSeed[] = [factorizationData as CurriculumSeed];

const SEED_BY_KEY = new Map<string, CurriculumSeed>(
  SEEDS.map((s) => [seedKey(s.subjectId, s.unitId), s]),
);

function seedKey(subjectId: string, unitId: string): string {
  return `${subjectId}::${unitId}`;
}

/** 모든 seed 를 subject 기준으로 묶은 카탈로그 (cascade picker 용). */
export function listSeedSubjects(): SeedSubjectMeta[] {
  const map = new Map<string, SeedSubjectMeta>();
  for (const seed of SEEDS) {
    let entry = map.get(seed.subjectId);
    if (!entry) {
      entry = {
        subjectId: seed.subjectId,
        subjectName: seed.subjectName,
        units: [],
      };
      map.set(seed.subjectId, entry);
    }
    entry.units.push({ unitId: seed.unitId, unitName: seed.unitName });
  }
  return [...map.values()];
}

/** subjectId + unitId 로 seed 찾기. 없으면 undefined. */
export function findSeed(
  subjectId: string,
  unitId: string,
): CurriculumSeed | undefined {
  return SEED_BY_KEY.get(seedKey(subjectId, unitId));
}
