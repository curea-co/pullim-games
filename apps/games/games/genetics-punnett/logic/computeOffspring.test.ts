import { describe, it, expect } from "vitest";
import {
  computeOffspring,
  gametesOf,
  normalizeGenotype,
  phenotypeFrequencies,
  phenotypeIndexOf,
  phenotypeLabels,
  phenotypeShorthand,
} from "./computeOffspring";
import type { Trait } from "../schema";

const traitsA: Trait[] = [
  { name: "씨앗 색", symbol: "A", dominant: "노란색", recessive: "초록색" },
];

const traitsAB: Trait[] = [
  { name: "씨앗 색", symbol: "A", dominant: "노란색", recessive: "초록색" },
  { name: "씨앗 모양", symbol: "B", dominant: "둥근", recessive: "주름" },
];

describe("gametesOf", () => {
  it("Aa → A, a", () => {
    expect(gametesOf("Aa", traitsA)).toEqual(["A", "a"]);
  });

  it("AA → A, A (호모도 중복 보존 — 펀넷 표준)", () => {
    expect(gametesOf("AA", traitsA)).toEqual(["A", "A"]);
  });

  it("AaBb → AB, Ab, aB, ab", () => {
    expect(gametesOf("AaBb", traitsAB)).toEqual(["AB", "Ab", "aB", "ab"]);
  });

  it("AAbb → Ab×4 (양쪽 모두 호모, 외적 4 gametes 보존)", () => {
    expect(gametesOf("AAbb", traitsAB)).toEqual(["Ab", "Ab", "Ab", "Ab"]);
  });
});

describe("normalizeGenotype", () => {
  it("aA → Aa", () => {
    expect(normalizeGenotype("aA", traitsA)).toBe("Aa");
  });

  it("bAaB → AaBb (형질별 정렬 + 대문자 우선)", () => {
    expect(normalizeGenotype("bAaB", traitsAB)).toBe("AaBb");
  });

  it("aabb → aabb (모두 열성)", () => {
    expect(normalizeGenotype("aabb", traitsAB)).toBe("aabb");
  });
});

describe("phenotypeIndexOf", () => {
  it("AA → 0 (우성)", () => {
    expect(phenotypeIndexOf("AA", traitsA)).toBe(0);
  });

  it("Aa → 0 (우성)", () => {
    expect(phenotypeIndexOf("Aa", traitsA)).toBe(0);
  });

  it("aa → 1 (열성)", () => {
    expect(phenotypeIndexOf("aa", traitsA)).toBe(1);
  });

  it("AaBb → 0 (둘 다 우성)", () => {
    expect(phenotypeIndexOf("AaBb", traitsAB)).toBe(0);
  });

  it("Aabb → 1 (A 우성, B 열성)", () => {
    expect(phenotypeIndexOf("Aabb", traitsAB)).toBe(1);
  });

  it("aaBb → 2 (A 열성, B 우성)", () => {
    expect(phenotypeIndexOf("aaBb", traitsAB)).toBe(2);
  });

  it("aabb → 3 (둘 다 열성)", () => {
    expect(phenotypeIndexOf("aabb", traitsAB)).toBe(3);
  });
});

describe("phenotypeLabels", () => {
  it("단성잡종 → [우성, 열성]", () => {
    expect(phenotypeLabels(traitsA)).toEqual(["노란색", "초록색"]);
  });

  it("양성잡종 → 4 카테고리", () => {
    expect(phenotypeLabels(traitsAB)).toEqual([
      "노란색 · 둥근",
      "노란색 · 주름",
      "초록색 · 둥근",
      "초록색 · 주름",
    ]);
  });
});

describe("phenotypeShorthand", () => {
  it("단성잡종 → ['A_', 'aa']", () => {
    expect(phenotypeShorthand(traitsA)).toEqual(["A_", "aa"]);
  });

  it("양성잡종 → ['A_B_','A_bb','aaB_','aabb']", () => {
    expect(phenotypeShorthand(traitsAB)).toEqual([
      "A_B_",
      "A_bb",
      "aaB_",
      "aabb",
    ]);
  });
});

describe("computeOffspring — 단성잡종", () => {
  it("Aa × Aa → 2×2 격자, 표현형 3:1", () => {
    const grid = computeOffspring("Aa", "Aa", traitsA);
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveLength(2);
    const freq = phenotypeFrequencies(grid, traitsA);
    expect(freq).toEqual([3, 1]);
  });

  it("Aa × aa (검정교배) → 1:1", () => {
    const grid = computeOffspring("Aa", "aa", traitsA);
    const freq = phenotypeFrequencies(grid, traitsA);
    expect(freq).toEqual([2, 2]);
  });

  it("AA × aa → 모두 우성 (4칸 모두 Aa)", () => {
    const grid = computeOffspring("AA", "aa", traitsA);
    const freq = phenotypeFrequencies(grid, traitsA);
    expect(freq).toEqual([4, 0]);
  });
});

describe("computeOffspring — 양성잡종", () => {
  it("AaBb × AaBb → 4×4 격자, 표현형 9:3:3:1", () => {
    const grid = computeOffspring("AaBb", "AaBb", traitsAB);
    expect(grid).toHaveLength(4);
    expect(grid[0]).toHaveLength(4);
    const freq = phenotypeFrequencies(grid, traitsAB);
    expect(freq).toEqual([9, 3, 3, 1]);
  });

  it("AaBb × aabb (검정교배) → 1:1:1:1 (raw 4:4:4:4)", () => {
    const grid = computeOffspring("AaBb", "aabb", traitsAB);
    const freq = phenotypeFrequencies(grid, traitsAB);
    expect(freq).toEqual([4, 4, 4, 4]);
  });

  it("AaBb × Aabb → 3:3:1:1 (raw 6:6:2:2)", () => {
    const grid = computeOffspring("AaBb", "Aabb", traitsAB);
    const freq = phenotypeFrequencies(grid, traitsAB);
    expect(freq).toEqual([6, 6, 2, 2]);
  });
});
