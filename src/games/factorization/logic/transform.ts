// 공통인수 추출 — terms × commonFactor → FactoredForm.
// 순수함수. side effect 0. property-based test 가능 (V0.2 fast-check 통합).
//
// V0.1: hand-authored card data (terms + isCommon 플래그) 기반 단순 변환.
// V0.2+: mathjs AST 파서로 polynomial → terms 자동 도출 → 같은 transform 적용.

import type { FactoredForm, Term } from "./types";

/**
 * 공통인수 추출.
 *
 * 입력 terms 의 각 part 에 대해:
 *   - isCommon === true 이면 공통인수의 일부 → 외부 factor로 이동
 *   - "·" (곱셈 연결자) 는 추출 후 제거 (남은 part 가 1개면 불필요)
 *   - 그 외 → remainder 항에 그대로
 *
 * @example
 *   // 2x + 4 → 2(x + 2)
 *   extractCommonFactor([
 *     { id: "t1", parts: [
 *       { id: "t1-p0", text: "2", isCommon: true },
 *       { id: "t1-p1", text: "·", isCommon: false },
 *       { id: "t1-p2", text: "x", isCommon: false },
 *     ]},
 *     { id: "t2", parts: [
 *       { id: "t2-p0", text: "2", isCommon: true },
 *       { id: "t2-p1", text: "·", isCommon: false },
 *       { id: "t2-p2", text: "2", isCommon: false },
 *     ]},
 *   ], "2")
 *   // → { factor: { id: "factor", text: "2" },
 *   //     remainders: [{ id: "r-t1", parts: [{ text: "x", ... }] },
 *   //                  { id: "r-t2", parts: [{ text: "2", ... }] }] }
 */
export function extractCommonFactor(
  terms: Term[],
  commonFactorText: string,
): FactoredForm {
  const remainders: Term[] = terms.map((term) => {
    // 공통인수 part + 분리 연결자(·) 제거 → 나머지 part 만 모음.
    const remaining = term.parts.filter(
      (p) => !p.isCommon && p.text !== "·",
    );
    return {
      id: `r-${term.id}`,
      parts: remaining.map((p) => ({
        ...p,
        id: `r-${p.id}`,
      })),
    };
  });

  return {
    factor: { id: "factor", text: commonFactorText },
    remainders,
  };
}

/**
 * Sanity check — 모든 term 이 공통인수 part 를 갖는지 검증.
 * 카드 데이터 큐레이션 실수 방지용. 실패 시 throw (silent miscompute 차단).
 */
export function assertAllTermsHaveCommonPart(terms: Term[]): void {
  for (const term of terms) {
    const hasCommon = term.parts.some((p) => p.isCommon);
    if (!hasCommon) {
      throw new Error(
        `[factorization] term "${term.id}" has no part marked isCommon — card data invalid`,
      );
    }
  }
}
