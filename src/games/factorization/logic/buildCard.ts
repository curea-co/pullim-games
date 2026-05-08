// 다항식 문자열 1개에서 FactorizationCard 자동 도출.
// 콘텐츠 큐레이터는 polynomial 만 넣으면 UI Term[] + factoredForm 모두 자동 계산.

import {
  extractCommonFactor,
  parsePolynomial,
  type Polynomial,
  type PolynomialTerm,
} from "@/lib/core";
import type { FactorizationCard } from "../schema";
import type { Part, Term as UiTerm } from "./types";

interface BuildCardOptions {
  id: string;
  unit: string;
  difficultySeed: 1 | 2 | 3 | 4 | 5;
  hint: string;
  polynomial: string;
}

const SUPERSCRIPT: Record<string, string> = {
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

/** PolynomialTerm 1개의 unsigned 표시 문자열 (계수 1 생략, 윗첨자). */
function termText(t: PolynomialTerm): string {
  const absCoef = Math.abs(t.coefficient);
  if (t.variable === "" || t.exponent === 0) return String(absCoef);
  const coefStr = absCoef === 1 ? "" : String(absCoef);
  if (t.exponent === 1) return `${coefStr}${t.variable}`;
  const sup = String(t.exponent)
    .split("")
    .map((d) => SUPERSCRIPT[d] ?? d)
    .join("");
  return `${coefStr}${t.variable}${sup}`;
}

/** Polynomial 의 사용자 향 표시 문자열 (공백 포함, 윗첨자). 예: "2x + 4". */
function polyText(poly: Polynomial): string {
  return poly
    .map((term, i) => {
      const sign =
        term.coefficient >= 0
          ? i === 0
            ? ""
            : " + "
          : i === 0
            ? "-"
            : " - ";
      return sign + termText(term);
    })
    .join("");
}

function isUnit(t: PolynomialTerm): boolean {
  return t.coefficient === 1 && t.variable === "" && t.exponent === 0;
}

/** Term ÷ Factor (단변수 가정). */
function divideTermByFactor(
  term: PolynomialTerm,
  factor: PolynomialTerm,
): PolynomialTerm {
  const newCoef = term.coefficient / factor.coefficient;
  const newExp = term.exponent - factor.exponent;
  return {
    coefficient: newCoef,
    variable: newExp > 0 ? term.variable : "",
    exponent: newExp,
  };
}

/**
 * 한 항을 파트로 분해 — 공통인수 부분(jade highlight) + ·  + 나머지.
 * 나머지가 1 이면 공통인수만 있는 단일 part 반환.
 */
function buildTermParts(
  termIdx: number,
  term: PolynomialTerm,
  factor: PolynomialTerm,
): Part[] {
  const rest = divideTermByFactor(term, factor);
  const factorStr = termText(factor);

  if (isUnit(rest)) {
    return [
      { id: `t${termIdx}-common`, text: factorStr, isCommon: true },
    ];
  }

  return [
    { id: `t${termIdx}-common`, text: factorStr, isCommon: true },
    { id: `t${termIdx}-mul`, text: "·", isCommon: false },
    { id: `t${termIdx}-rest`, text: termText(rest), isCommon: false },
  ];
}

/**
 * 다항식 문자열 1개로 FactorizationCard 자동 도출.
 *
 * @example
 *   buildCard({
 *     id: "card-001",
 *     unit: "고1-인수분해-공통인수",
 *     difficultySeed: 1,
 *     hint: "공통인수를 찾아 끌어내세요",
 *     polynomial: "2x + 4",
 *   });
 *   // → { polynomial: "2x + 4", terms: [...], commonFactor: "2", factoredForm: "2(x + 2)" }
 */
export function buildCard(opts: BuildCardOptions): FactorizationCard {
  const poly = parsePolynomial(opts.polynomial);
  const result = extractCommonFactor(poly);
  if (!result) {
    throw new Error(
      `buildCard: no common factor in "${opts.polynomial}" — 공통인수 메커닉에 부적합`,
    );
  }

  const uiTerms: UiTerm[] = poly.map((term, i) => ({
    id: `t${i + 1}`,
    parts: buildTermParts(i + 1, term, result.factor),
  }));

  const commonFactor = termText(result.factor);
  const factoredForm = `${commonFactor}(${polyText(result.remainders)})`;

  return {
    id: opts.id,
    type: "factorization-block",
    unit: opts.unit,
    difficultySeed: opts.difficultySeed,
    hint: opts.hint,
    problem: {
      polynomial: polyText(poly),
      terms: uiTerms,
      commonFactor,
      factoredForm,
    },
  };
}
