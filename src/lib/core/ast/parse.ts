// 다항식 문자열 → Polynomial 파서.
// 한국 교과서 표기 (윗첨자 `²` `³` 등) + 표준 표기 (`x^2`) 둘 다 지원.
//
// 지원 형식:
//   "2x + 4", "x² + 5x + 6", "2x^2 + 7x + 3", "-3x³ - 1"
// 미지원 (V0.3+):
//   다변수, 괄호 묶기, 분수, 함수 호출

import type { Polynomial, PolynomialTerm } from "./types";

const SUPERSCRIPT_TO_CARET: Record<string, string> = {
  "⁰": "^0",
  "¹": "^1",
  "²": "^2",
  "³": "^3",
  "⁴": "^4",
  "⁵": "^5",
  "⁶": "^6",
  "⁷": "^7",
  "⁸": "^8",
  "⁹": "^9",
};

/** 입력 정규화: 윗첨자 → caret 표기, 공백 제거. */
function normalize(input: string): string {
  let s = input;
  for (const [sup, caret] of Object.entries(SUPERSCRIPT_TO_CARET)) {
    s = s.split(sup).join(caret);
  }
  return s.replace(/\s+/g, "");
}

/**
 * 부호 있는 항 단위로 분해.
 * "2x+4-3x^2" → ["+2x", "+4", "-3x^2"]
 */
function tokenizeTerms(normalized: string): string[] {
  const tokens: string[] = [];
  let cursor = 0;
  // 첫 글자가 부호가 아니면 + 를 prefix
  while (cursor < normalized.length) {
    const ch = normalized[cursor]!;
    let end = cursor + 1;
    while (end < normalized.length) {
      const nextCh = normalized[end]!;
      if (nextCh === "+" || nextCh === "-") break;
      end += 1;
    }
    let token = normalized.slice(cursor, end);
    if (token[0] !== "+" && token[0] !== "-") token = `+${token}`;
    tokens.push(token);
    cursor = end;
  }
  return tokens;
}

const TERM_REGEX = /^([+-])(\d+)?([a-zA-Z])?(?:\^(\d+))?$/;

function parseTerm(token: string): PolynomialTerm {
  const match = TERM_REGEX.exec(token);
  if (!match) {
    throw new Error(`Invalid polynomial term: "${token}"`);
  }
  const [, signStr, coefStr, varStr, expStr] = match;
  const sign = signStr === "-" ? -1 : 1;

  // 항이 비어있으면 (signStr 만 있고 나머지 없으면) 잘못된 입력
  if (coefStr === undefined && varStr === undefined) {
    throw new Error(`Empty polynomial term: "${token}"`);
  }

  const coefficient = sign * (coefStr !== undefined ? parseInt(coefStr, 10) : 1);
  const variable = varStr ?? "";
  const exponent =
    variable === "" ? 0 : expStr !== undefined ? parseInt(expStr, 10) : 1;

  return { coefficient, variable, exponent };
}

/**
 * 다항식 문자열 → Polynomial.
 * 같은 변수·지수 쌍은 자동으로 합치지 않음 — 입력 그대로의 구조 보존.
 */
export function parsePolynomial(input: string): Polynomial {
  if (input.trim() === "") {
    throw new Error("Empty polynomial");
  }
  const normalized = normalize(input);
  const tokens = tokenizeTerms(normalized);
  return tokens.map(parseTerm);
}
