// 다항식 문자열 1개에서 FactorizationCard 자동 도출.
// 콘텐츠 큐레이터는 polynomial 만 넣으면 UI Term[] + factoredForm + distractors 모두 자동 계산.

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
  /** 함정 chip 후보 override (생략 시 자동 생성). plan §1 distractors. */
  distractors?: [string, string];
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
 * 정답 공통인수 + 다항식 구조 기반으로 함정 chip 후보 2 개 자동 생성.
 * plan 2026-05-14_factorization-discrimination §1 distractors 룰:
 *   ① 정답의 약수 (계수/지수 한 단계 약화)
 *   ② 다항식에 등장하는 term 의 일부
 *   ③ 정답의 배수
 * 정답과 다르고 서로 다른 2 개를 우선순위 순으로 선택.
 */
export function generateDistractors(
  factor: PolynomialTerm,
  poly: Polynomial,
): [string, string] {
  const factorStr = termText(factor);
  const candidates: string[] = [];

  // ① 약화: 계수 가장 큰 진약수
  if (factor.coefficient > 1) {
    for (let d = Math.floor(factor.coefficient / 2); d >= 2; d -= 1) {
      if (factor.coefficient % d === 0) {
        candidates.push(
          termText({
            coefficient: d,
            variable: factor.variable,
            exponent: factor.exponent,
          }),
        );
        break;
      }
    }
  }
  // ① 약화: 변수만 (계수=1)
  if (factor.variable && factor.coefficient > 1) {
    candidates.push(
      termText({
        coefficient: 1,
        variable: factor.variable,
        exponent: factor.exponent,
      }),
    );
  }
  // ① 약화: 계수만 (변수 제거)
  if (factor.variable && factor.coefficient !== 0) {
    candidates.push(
      termText({ coefficient: factor.coefficient, variable: "", exponent: 0 }),
    );
  }
  // ① 약화: 지수 -1
  if (factor.exponent > 1) {
    candidates.push(
      termText({
        coefficient: factor.coefficient,
        variable: factor.variable,
        exponent: factor.exponent - 1,
      }),
    );
  }

  // ② 다항식 term 일부 (각 term 전체)
  for (const t of poly) {
    candidates.push(termText({ ...t, coefficient: Math.abs(t.coefficient) }));
  }

  // ③ 배수: 계수 2배
  if (factor.coefficient !== 0) {
    candidates.push(
      termText({
        coefficient: factor.coefficient * 2,
        variable: factor.variable,
        exponent: factor.exponent,
      }),
    );
  }
  // ③ 배수: 지수 +1
  if (factor.variable) {
    candidates.push(
      termText({
        coefficient: factor.coefficient,
        variable: factor.variable,
        exponent: factor.exponent + 1,
      }),
    );
  }

  // 정답 제거, 중복 제거
  const filtered = candidates.filter((c) => c !== factorStr && c !== "1");
  const unique = Array.from(new Set(filtered));

  // 부족 시 fallback
  if (unique.length < 2) {
    unique.push(
      termText({
        coefficient: factor.coefficient + 1,
        variable: factor.variable,
        exponent: factor.exponent,
      }),
    );
  }
  const deduped = Array.from(new Set(unique.filter((c) => c !== factorStr)));

  return [deduped[0]!, deduped[1]!];
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
 *   // → { polynomial: "2x + 4", terms: [...], commonFactor: "2", factoredForm: "2(x + 2)", distractors: ["x", "4"] }
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
  const distractors =
    opts.distractors ?? generateDistractors(result.factor, poly);

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
      distractors,
    },
  };
}
