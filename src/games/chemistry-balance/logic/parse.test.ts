import { describe, it, expect } from "vitest";
import { parseFormula, sumSide, isBalanced } from "./parse";

describe("parseFormula", () => {
  it("단일 원소", () => {
    expect(parseFormula("Fe")).toEqual({ Fe: 1 });
  });
  it("이원자 분자", () => {
    expect(parseFormula("O2")).toEqual({ O: 2 });
  });
  it("물", () => {
    expect(parseFormula("H2O")).toEqual({ H: 2, O: 1 });
  });
  it("산화철", () => {
    expect(parseFormula("Fe2O3")).toEqual({ Fe: 2, O: 3 });
  });
  it("KClO3", () => {
    expect(parseFormula("KClO3")).toEqual({ K: 1, Cl: 1, O: 3 });
  });
  it("C2H6", () => {
    expect(parseFormula("C2H6")).toEqual({ C: 2, H: 6 });
  });
});

describe("sumSide", () => {
  it("계수 적용", () => {
    expect(
      sumSide([
        { formula: "H2", coefficient: 2 },
        { formula: "O2", coefficient: 1 },
      ]),
    ).toEqual({ H: 4, O: 2 });
  });
});

describe("isBalanced", () => {
  it("정답 계수에서 균형", () => {
    expect(
      isBalanced(
        [
          { formula: "H2", coefficient: 2 },
          { formula: "O2", coefficient: 1 },
        ],
        [{ formula: "H2O", coefficient: 2 }],
      ),
    ).toBe(true);
  });
  it("계수 부정확 시 불균형", () => {
    expect(
      isBalanced(
        [
          { formula: "H2", coefficient: 1 },
          { formula: "O2", coefficient: 1 },
        ],
        [{ formula: "H2O", coefficient: 2 }],
      ),
    ).toBe(false);
  });
  it("에탄 연소 정답 (2/7/4/6)", () => {
    expect(
      isBalanced(
        [
          { formula: "C2H6", coefficient: 2 },
          { formula: "O2", coefficient: 7 },
        ],
        [
          { formula: "CO2", coefficient: 4 },
          { formula: "H2O", coefficient: 6 },
        ],
      ),
    ).toBe(true);
  });
});
