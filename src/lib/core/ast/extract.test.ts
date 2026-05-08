// 공통인수 추출 단위 + property-based 테스트.

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { parsePolynomial } from "./parse";
import { extractCommonFactor, multiplyByFactor } from "./extract";

describe("extractCommonFactor — 단위", () => {
  it("2x + 4 → factor=2, remainders=[x, 2]", () => {
    const result = extractCommonFactor(parsePolynomial("2x + 4"));
    expect(result).not.toBeNull();
    expect(result!.factor).toEqual({ coefficient: 2, variable: "", exponent: 0 });
    expect(result!.remainders).toEqual([
      { coefficient: 1, variable: "x", exponent: 1 },
      { coefficient: 2, variable: "", exponent: 0 },
    ]);
  });

  it("6x² + 8x → factor=2x, remainders=[3x, 4]", () => {
    const result = extractCommonFactor(parsePolynomial("6x² + 8x"));
    expect(result).not.toBeNull();
    expect(result!.factor).toEqual({ coefficient: 2, variable: "x", exponent: 1 });
    expect(result!.remainders).toEqual([
      { coefficient: 3, variable: "x", exponent: 1 },
      { coefficient: 4, variable: "", exponent: 0 },
    ]);
  });

  it("2x² + 7x + 3 → null (공통인수 없음)", () => {
    const result = extractCommonFactor(parsePolynomial("2x² + 7x + 3"));
    expect(result).toBeNull();
  });

  it("3x + 9 → factor=3, remainders=[x, 3]", () => {
    const result = extractCommonFactor(parsePolynomial("3x + 9"));
    expect(result?.factor.coefficient).toBe(3);
    expect(result?.remainders).toEqual([
      { coefficient: 1, variable: "x", exponent: 1 },
      { coefficient: 3, variable: "", exponent: 0 },
    ]);
  });

  it("단일 항 → null (공통인수 정의 X)", () => {
    expect(extractCommonFactor(parsePolynomial("2x"))).toBeNull();
  });
});

describe("extractCommonFactor — property-based round-trip", () => {
  // 공통인수가 있을 만한 다항식 생성: factor × (poly) 형태
  const arb = fc.record({
    factorCoef: fc.integer({ min: 1, max: 9 }),
    factorExp: fc.integer({ min: 0, max: 2 }),
    coefs: fc.array(
      fc.integer({ min: 1, max: 9 }).filter((n) => n !== 0),
      { minLength: 2, maxLength: 4 },
    ),
    extraExps: fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 2, maxLength: 4 }),
  });

  it("factor × remainders == 원본 (math identity)", () => {
    fc.assert(
      fc.property(arb, ({ factorCoef, factorExp, coefs, extraExps }) => {
        // 합성: factor=ax^p, 각 항은 factor × (b_i x^q_i)
        const factor = {
          coefficient: factorCoef,
          variable: factorExp > 0 ? "x" : "",
          exponent: factorExp,
        };
        const innerTerms = coefs.map((b, i) => {
          const q = extraExps[i] ?? 0;
          return {
            coefficient: b,
            variable: q > 0 ? "x" : "",
            exponent: q,
          };
        });
        const synthesized = multiplyByFactor(factor, innerTerms);

        // 원본의 모든 항이 다른 부호인 케이스 등 도전적이지 않게 하기 위해
        // 모든 항을 양수로 가정. 추출 결과가 원본과 동치인지 검증.
        const result = extractCommonFactor(synthesized);
        if (result === null) {
          // 공통인수 추출 못한 케이스 — factor=1 상수면 가능
          // 일관성 있게 factorCoef === 1 && factorExp === 0 면 그럴 수 있음
          return factorCoef === 1 && factorExp === 0;
        }
        // 추출된 factor × remainders 가 원본과 동치여야 함
        const reconstructed = multiplyByFactor(
          result.factor,
          result.remainders,
        );
        expect(reconstructed).toEqual(synthesized);
        return true;
      }),
      { numRuns: 60 },
    );
  });
});
