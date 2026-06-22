// Polynomial → 정규 문자열 (caret 표기).
// 사람용 표시 ("2x²") 와 캐럿 표기 ("2x^2") 두 모드.

import type { Polynomial, PolynomialTerm } from "./types";

const DIGIT_TO_SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

interface StringifyOptions {
  /** true 면 윗첨자 (`²`), false 면 caret (`^2`). 기본: false (parse round-trip 안전). */
  superscript?: boolean;
}

function exponentToString(exp: number, opts: StringifyOptions): string {
  if (exp === 0 || exp === 1) return "";
  if (opts.superscript) {
    return String(exp)
      .split("")
      .map((d) => DIGIT_TO_SUPERSCRIPT[d] ?? d)
      .join("");
  }
  return `^${exp}`;
}

function stringifyTerm(
  term: PolynomialTerm,
  isFirst: boolean,
  opts: StringifyOptions,
): string {
  const sign = term.coefficient >= 0 ? (isFirst ? "" : "+") : "-";
  const absCoef = Math.abs(term.coefficient);

  // 변수 없는 상수항
  if (term.variable === "" || term.exponent === 0) {
    return `${sign}${absCoef}`;
  }

  // 계수 1 일 때는 생략
  const coefStr = absCoef === 1 ? "" : String(absCoef);
  const expStr = exponentToString(term.exponent, opts);
  return `${sign}${coefStr}${term.variable}${expStr}`;
}

export function stringifyPolynomial(
  poly: Polynomial,
  opts: StringifyOptions = {},
): string {
  if (poly.length === 0) return "0";
  return poly
    .map((term, i) => stringifyTerm(term, i === 0, opts))
    .join("");
}
