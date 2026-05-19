// 변별력 distractor 자동 생성 helper.
// plan: proc/plan/2026-05-19_plan-c-distractor-policy-and-mechanism-unify.md §3 Phase 1
//
// 사용 예: math-quick-quiz 의 4지선다 — answer 외 distractor 3개 pool에서 추출.
// memory 룰 학습효과 우선: pool 부족 시 fallback 으로 부족 채움 (silent fail X).

/**
 * Mulberry32 — 결정적 seeded shuffle. seed 같으면 결과 같음.
 * factorization 와 동일 패턴.
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed?: number): T[] {
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * pool에서 correct 제외 + seeded shuffle + count개 추출.
 *
 * - pool 에 correct 중복 가능 → dedup 후 추출 (변별력 차이 없는 distractor 회피).
 * - pool 부족 시 가능한 만큼만 반환 (silent fail X — 호출자가 빈 배열·짧은 배열 처리).
 * - seed 명시 시 재현 가능 (테스트·정적 콘텐츠).
 *
 * @returns count 이하의 distractor 배열 (correct 미포함).
 */
export function buildDistractors(
  correct: string,
  pool: string[],
  count: number = 2,
  seed?: number,
): string[] {
  // dedup + correct 제거
  const dedup = Array.from(new Set(pool));
  const candidates = dedup.filter((c) => c !== correct);
  if (candidates.length === 0) return [];
  const shuffled = seededShuffle(candidates, seed);
  return shuffled.slice(0, count);
}
