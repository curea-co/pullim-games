// 다항식 공통인수 추출 — Polynomial 레벨.
// UI 레벨의 Term/Part 변환은 src/games/factorization/logic/ 가 담당.

import type { Polynomial, PolynomialTerm } from "./types";

function gcdInt(a: number, b: number): number {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b > 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function gcdAll(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, n) => gcdInt(acc, n), Math.abs(nums[0]!));
}

export interface CommonFactorResult {
  /** 추출된 공통인수. */
  factor: PolynomialTerm;
  /** 공통인수를 빼고 남은 다항식. */
  remainders: Polynomial;
}

/**
 * 다항식에서 공통인수 추출.
 * 공통인수 = (계수의 GCD) × (모든 항이 공유하는 최저차 변수항).
 *
 * @returns 공통인수가 trivial(1) 이면 null.
 *
 * @example
 *   parsePolynomial("2x + 4") → [{2,x,1}, {4,'',0}]
 *   extractCommonFactor → factor={2,'',0}, remainders=[{1,x,1}, {2,'',0}]
 *
 *   parsePolynomial("6x² + 8x") → [{6,x,2}, {8,x,1}]
 *   extractCommonFactor → factor={2,x,1}, remainders=[{3,x,1}, {4,'',0}]
 *
 *   parsePolynomial("2x² + 7x + 3") → [{2,x,2}, {7,x,1}, {3,'',0}]
 *   extractCommonFactor → null (gcd=1, 상수항으로 인해 공통변수 없음)
 */
export function extractCommonFactor(
  poly: Polynomial,
): CommonFactorResult | null {
  if (poly.length < 2) return null;
  if (poly.some((t) => t.coefficient === 0)) {
    // 0 항 포함 시 GCD 정의 흔들림 — 정규화 필요로 간주, 일단 reject
    return null;
  }

  const gcdNum = gcdAll(poly.map((t) => t.coefficient));

  // 모든 항이 같은 변수를 공유하고, 최저차가 1 이상인지
  const variables = poly.map((t) => t.variable);
  const firstVar = variables[0]!;
  const allShareSameVar =
    firstVar !== "" && variables.every((v) => v === firstVar);
  const minExp = allShareSameVar
    ? Math.min(...poly.map((t) => t.exponent))
    : 0;

  const commonVar = allShareSameVar && minExp >= 1 ? firstVar : "";
  const commonExp = commonVar ? minExp : 0;

  // 공통인수가 1 (numeric) AND 변수도 없으면 trivial → 추출 의미 X
  if (gcdNum <= 1 && commonVar === "") return null;

  return {
    factor: {
      coefficient: gcdNum,
      variable: commonVar,
      exponent: commonExp,
    },
    remainders: poly.map((t) => ({
      coefficient: t.coefficient / gcdNum,
      variable: commonVar
        ? // 공통 변수가 있으면 모든 t.variable === commonVar 라 가정 안전
          t.exponent - commonExp === 0
          ? ""
          : t.variable
        : t.variable,
      exponent: commonVar ? t.exponent - commonExp : t.exponent,
    })),
  };
}

/**
 * 추출 검증용 — factor × remainders 가 원본 다항식과 동치인지.
 * property-based test 의 round-trip 검증에 사용.
 */
export function multiplyByFactor(
  factor: PolynomialTerm,
  poly: Polynomial,
): Polynomial {
  return poly.map((t) => ({
    coefficient: t.coefficient * factor.coefficient,
    variable: factor.variable && t.variable ? t.variable : factor.variable || t.variable,
    exponent: t.exponent + factor.exponent,
  }));
}
