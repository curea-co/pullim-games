// 다항식 파서 단위 + property-based 테스트.

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { parsePolynomial } from "./parse";
import { stringifyPolynomial } from "./stringify";
import type { PolynomialTerm } from "./types";

describe("parsePolynomial — 단위", () => {
  it("상수항만", () => {
    expect(parsePolynomial("4")).toEqual<PolynomialTerm[]>([
      { coefficient: 4, variable: "", exponent: 0 },
    ]);
  });

  it("음수 상수", () => {
    expect(parsePolynomial("-7")).toEqual<PolynomialTerm[]>([
      { coefficient: -7, variable: "", exponent: 0 },
    ]);
  });

  it("선형: 2x + 4", () => {
    expect(parsePolynomial("2x + 4")).toEqual<PolynomialTerm[]>([
      { coefficient: 2, variable: "x", exponent: 1 },
      { coefficient: 4, variable: "", exponent: 0 },
    ]);
  });

  it("계수 1 생략: x + 1", () => {
    expect(parsePolynomial("x + 1")).toEqual<PolynomialTerm[]>([
      { coefficient: 1, variable: "x", exponent: 1 },
      { coefficient: 1, variable: "", exponent: 0 },
    ]);
  });

  it("음수 계수 1 생략: -x", () => {
    expect(parsePolynomial("-x")).toEqual<PolynomialTerm[]>([
      { coefficient: -1, variable: "x", exponent: 1 },
    ]);
  });

  it("윗첨자: x²", () => {
    expect(parsePolynomial("x²")).toEqual<PolynomialTerm[]>([
      { coefficient: 1, variable: "x", exponent: 2 },
    ]);
  });

  it("caret: x^2", () => {
    expect(parsePolynomial("x^2")).toEqual<PolynomialTerm[]>([
      { coefficient: 1, variable: "x", exponent: 2 },
    ]);
  });

  it("이차다항식 윗첨자: 2x² + 7x + 3", () => {
    expect(parsePolynomial("2x² + 7x + 3")).toEqual<PolynomialTerm[]>([
      { coefficient: 2, variable: "x", exponent: 2 },
      { coefficient: 7, variable: "x", exponent: 1 },
      { coefficient: 3, variable: "", exponent: 0 },
    ]);
  });

  it("부호 섞임: x³ - 1", () => {
    expect(parsePolynomial("x³ - 1")).toEqual<PolynomialTerm[]>([
      { coefficient: 1, variable: "x", exponent: 3 },
      { coefficient: -1, variable: "", exponent: 0 },
    ]);
  });

  it("공백 무시: '  2x   +  4  '", () => {
    expect(parsePolynomial("  2x   +  4  ")).toEqual<PolynomialTerm[]>([
      { coefficient: 2, variable: "x", exponent: 1 },
      { coefficient: 4, variable: "", exponent: 0 },
    ]);
  });

  it("빈 입력은 throw", () => {
    expect(() => parsePolynomial("")).toThrow();
    expect(() => parsePolynomial("   ")).toThrow();
  });

  it("부호만 있는 입력은 throw", () => {
    expect(() => parsePolynomial("+")).toThrow();
  });
});

describe("parse → stringify round-trip (property-based)", () => {
  // 각 항: {1..50} (계수), 'x' (변수), {0..3} (지수)
  const termArb: fc.Arbitrary<PolynomialTerm> = fc.record({
    coefficient: fc.integer({ min: 1, max: 50 }).map((n) =>
      n * (Math.random() < 0.5 ? -1 : 1),
    ),
    variable: fc.constantFrom("x", ""),
    exponent: fc.integer({ min: 0, max: 3 }),
  }).map((t) => {
    // 정규화: 변수 없으면 지수 0
    if (t.variable === "") return { ...t, exponent: 0 };
    // 지수 0 면 변수 없음으로 (constant)
    if (t.exponent === 0) return { ...t, variable: "" };
    return t;
  });

  const polyArb = fc.array(termArb, { minLength: 1, maxLength: 4 }).filter(
    // 모든 계수가 0 아닌 것 (parser가 빈 항 거부)
    (poly) => poly.every((t) => t.coefficient !== 0),
  );

  it("stringify → parse 동치", () => {
    fc.assert(
      fc.property(polyArb, (poly) => {
        const str = stringifyPolynomial(poly);
        const parsed = parsePolynomial(str);
        // 순서 보존, 정규화된 형태가 동치여야 함
        expect(parsed).toEqual(poly);
      }),
      { numRuns: 100 },
    );
  });

  it("윗첨자 stringify 도 parse 가능", () => {
    fc.assert(
      fc.property(polyArb, (poly) => {
        const str = stringifyPolynomial(poly, { superscript: true });
        const parsed = parsePolynomial(str);
        expect(parsed).toEqual(poly);
      }),
      { numRuns: 50 },
    );
  });
});
