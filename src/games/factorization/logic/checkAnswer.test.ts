import { describe, expect, it } from "vitest";
import {
  arePolynomialsEqual,
  checkAnswer,
  deriveAnswer,
} from "./checkAnswer";
import { parsePolynomial } from "@/lib/core";

describe("arePolynomialsEqual", () => {
  it("같은 다항식", () => {
    const a = parsePolynomial("2x + 4");
    const b = parsePolynomial("2x + 4");
    expect(arePolynomialsEqual(a, b)).toBe(true);
  });

  it("순서 다른 같은 다항식 (4 + 2x vs 2x + 4)", () => {
    expect(
      arePolynomialsEqual(
        parsePolynomial("4 + 2x"),
        parsePolynomial("2x + 4"),
      ),
    ).toBe(true);
  });

  it("계수 다르면 false", () => {
    expect(
      arePolynomialsEqual(
        parsePolynomial("2x + 4"),
        parsePolynomial("3x + 4"),
      ),
    ).toBe(false);
  });

  it("0 계수 항은 무시", () => {
    expect(
      arePolynomialsEqual(
        parsePolynomial("2x + 4"),
        // 0x^2 + 2x + 4 (수동 합성 — parser가 0을 거부하지 않음 가정)
        [
          { coefficient: 2, variable: "x", exponent: 1 },
          { coefficient: 4, variable: "", exponent: 0 },
          { coefficient: 0, variable: "x", exponent: 2 },
        ],
      ),
    ).toBe(true);
  });
});

describe("checkAnswer", () => {
  it("Card 1: 2x + 4 = 2 × (x + 2)", () => {
    expect(
      checkAnswer(
        "2x + 4",
        { coefficient: 2, variable: "", exponent: 0 },
        [
          { coefficient: 1, variable: "x", exponent: 1 },
          { coefficient: 2, variable: "", exponent: 0 },
        ],
      ),
    ).toBe(true);
  });

  it("잘못된 factor 는 false", () => {
    expect(
      checkAnswer(
        "2x + 4",
        { coefficient: 3, variable: "", exponent: 0 }, // 잘못된 공통인수
        [
          { coefficient: 1, variable: "x", exponent: 1 },
          { coefficient: 2, variable: "", exponent: 0 },
        ],
      ),
    ).toBe(false);
  });

  it("Card with x factor: 6x² + 8x = 2x × (3x + 4)", () => {
    expect(
      checkAnswer(
        "6x² + 8x",
        { coefficient: 2, variable: "x", exponent: 1 },
        [
          { coefficient: 3, variable: "x", exponent: 1 },
          { coefficient: 4, variable: "", exponent: 0 },
        ],
      ),
    ).toBe(true);
  });
});

describe("deriveAnswer", () => {
  it("Card 1 정답 자동 도출", () => {
    const ans = deriveAnswer("2x + 4");
    expect(ans).not.toBeNull();
    expect(ans!.factor).toEqual({ coefficient: 2, variable: "", exponent: 0 });
  });

  it("공통인수 없는 다항식은 null", () => {
    expect(deriveAnswer("2x² + 7x + 3")).toBeNull();
  });
});
