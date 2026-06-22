// 자손 유전자형/표현형 계산 — 순수함수.
// 부모 유전자형 → 생식세포(gametes) → 외적 곱 → 자손 격자 + 표현형 빈도.
//
// 우성/열성 판정 규칙 (멘델):
//   - 대립유전자 한 쌍에 대문자가 1개라도 있으면 우성 표현형
//   - 둘 다 소문자면 열성 표현형
//
// 표현형 카테고리 순서 (양성잡종 기준): A_B_, A_bb, aaB_, aabb
// 단성잡종 기준: A_, aa

import type { Trait } from "../schema";

export interface OffspringGenotype {
  /** 자손 유전자형. 예: "AaBb", "AAbb". 알파벳 + 대소문자 정규화됨. */
  genotype: string;
  /** 표현형 카테고리 인덱스 (0..2^N-1). 카테고리 순서는 phenotypeCategories(). */
  phenotypeIndex: number;
}

/** 부모 유전자형 → 생식세포 리스트. 동형접합도 중복 보존 — 교과서 펀넷 표준 (AA → ["A","A"]).
 *  예: "Aa" → ["A","a"], "AaBb" → ["AB","Ab","aB","ab"], "AAbb" → ["Ab","Ab"]. */
export function gametesOf(genotype: string, traits: Trait[]): string[] {
  // 형질 쌍 단위로 분리 — 예: "AaBb" → ["Aa","Bb"], "Aa" → ["Aa"]
  const pairs: string[] = [];
  let i = 0;
  for (const _t of traits) {
    pairs.push(genotype.slice(i, i + 2));
    i += 2;
  }
  if (i !== genotype.length) {
    throw new Error(
      `[genetics-punnett] genotype length mismatch — got "${genotype}" for ${traits.length} trait(s)`,
    );
  }
  // 각 쌍에서 한 글자씩 선택 → 외적. 중복 제거 X (펀넷 사각형 표준).
  let result: string[] = [""];
  for (const pair of pairs) {
    const next: string[] = [];
    for (const prefix of result) {
      for (const allele of pair) {
        next.push(prefix + allele);
      }
    }
    result = next;
  }
  return result;
}

/** 자손 한 명의 유전자형을 정규화 — 대문자 먼저, 형질별 정렬. 예: "aA" → "Aa", "bAaB" → "AaBb". */
export function normalizeGenotype(raw: string, traits: Trait[]): string {
  if (raw.length !== traits.length * 2) {
    throw new Error(
      `[genetics-punnett] genotype length must be ${traits.length * 2}, got "${raw}"`,
    );
  }
  const out: string[] = [];
  for (const t of traits) {
    const target = t.symbol.toUpperCase();
    const found = [...raw].filter(
      (ch) => ch.toUpperCase() === target,
    );
    if (found.length !== 2) {
      throw new Error(
        `[genetics-punnett] expected 2 alleles for symbol "${t.symbol}" in "${raw}", got ${found.length}`,
      );
    }
    // 대문자 먼저, 소문자 뒤
    found.sort((a, b) => {
      const aUpper = a === a.toUpperCase();
      const bUpper = b === b.toUpperCase();
      if (aUpper && !bUpper) return -1;
      if (!aUpper && bUpper) return 1;
      return 0;
    });
    out.push(found.join(""));
  }
  return out.join("");
}

/** 자손 유전자형 → 표현형 카테고리 인덱스. */
export function phenotypeIndexOf(genotype: string, traits: Trait[]): number {
  let index = 0;
  for (let t = 0; t < traits.length; t++) {
    const pair = genotype.slice(t * 2, t * 2 + 2);
    const hasDominant = [...pair].some((ch) => ch === ch.toUpperCase());
    // 카테고리 비트: 첫 형질이 최상위 비트. 예: A_B_=0, A_bb=1, aaB_=2, aabb=3
    if (!hasDominant) {
      index |= 1 << (traits.length - 1 - t);
    }
  }
  return index;
}

/** 표현형 카테고리 라벨 (UI 표시용). 예: 양성잡종 → ["둥근 노란", "둥근 초록", "주름 노란", "주름 초록"]. */
export function phenotypeLabels(traits: Trait[]): string[] {
  const n = 1 << traits.length;
  const labels: string[] = [];
  for (let idx = 0; idx < n; idx++) {
    const parts: string[] = [];
    for (let t = 0; t < traits.length; t++) {
      const isRecessive = (idx >> (traits.length - 1 - t)) & 1;
      parts.push(isRecessive ? traits[t]!.recessive : traits[t]!.dominant);
    }
    labels.push(parts.join(" · "));
  }
  return labels;
}

/** 표현형 카테고리 유전자형 표기 (UI 보조). 예: "A_B_", "A_bb", "aaB_", "aabb". */
export function phenotypeShorthand(traits: Trait[]): string[] {
  const n = 1 << traits.length;
  const out: string[] = [];
  for (let idx = 0; idx < n; idx++) {
    let s = "";
    for (let t = 0; t < traits.length; t++) {
      const isRecessive = (idx >> (traits.length - 1 - t)) & 1;
      const sym = traits[t]!.symbol;
      s += isRecessive ? sym.toLowerCase().repeat(2) : `${sym.toUpperCase()}_`;
    }
    out.push(s);
  }
  return out;
}

/** 부모 유전자형 한 쌍 → 자손 격자 (gametes1 × gametes2). */
export function computeOffspring(
  p1: string,
  p2: string,
  traits: Trait[],
): OffspringGenotype[][] {
  const g1 = gametesOf(p1, traits);
  const g2 = gametesOf(p2, traits);
  return g1.map((row) =>
    g2.map((col) => {
      const raw = row + col;
      const genotype = normalizeGenotype(raw, traits);
      return {
        genotype,
        phenotypeIndex: phenotypeIndexOf(genotype, traits),
      };
    }),
  );
}

/** 자손 격자 → 표현형 빈도 (카테고리 순서대로). */
export function phenotypeFrequencies(
  grid: OffspringGenotype[][],
  traits: Trait[],
): number[] {
  const n = 1 << traits.length;
  const counts = new Array<number>(n).fill(0);
  for (const row of grid) {
    for (const cell of row) {
      counts[cell.phenotypeIndex]! += 1;
    }
  }
  return counts;
}
