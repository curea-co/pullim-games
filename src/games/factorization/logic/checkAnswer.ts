// 사용자가 제출한 인수분해 답 vs 카드의 정답 동치성 검사.
// V0.2: 다항식 expand 후 동치 비교 (factor × remainders == original).
// V0.3+: 다양한 표현 형태 ("2(x+2)" vs "(x+2)·2" vs "2x+4" 등) 정규화 비교.

import {
  extractCommonFactor,
  multiplyByFactor,
  parsePolynomial,
  type Polynomial,
} from "@/lib/core";

/**
 * 다항식 두 개가 항 단위로 동치인지 검사.
 * 같은 (variable, exponent) 끼리 계수 합이 일치하면 동치.
 */
export function arePolynomialsEqual(
  a: Polynomial,
  b: Polynomial,
): boolean {
  const normalize = (poly: Polynomial): Map<string, number> => {
    const m = new Map<string, number>();
    for (const t of poly) {
      const key = `${t.variable}^${t.exponent}`;
      m.set(key, (m.get(key) ?? 0) + t.coefficient);
    }
    // 계수 0 제거 (0 항은 무시)
    for (const [k, v] of m.entries()) {
      if (v === 0) m.delete(k);
    }
    return m;
  };

  const ma = normalize(a);
  const mb = normalize(b);
  if (ma.size !== mb.size) return false;
  for (const [k, v] of ma.entries()) {
    if (mb.get(k) !== v) return false;
  }
  return true;
}

/**
 * 사용자가 추출한 인수분해 결과가 원본 다항식과 동치인지 검증.
 *
 * 입력: 원본 다항식 (예: "2x + 4") + 사용자가 도출한 (factor, remainders)
 * 출력: factor × remainders 가 원본과 동치이면 true
 *
 * V0.2 의 드래그 인터랙션은 단일 추출만 다루지만, 이 함수는 일반화된 검증 도구로
 * 추후 텍스트 입력·자유 풀이 등에 재사용 가능.
 */
export function checkAnswer(
  originalPolynomial: string,
  userFactor: { coefficient: number; variable: string; exponent: number },
  userRemainders: Polynomial,
): boolean {
  const original = parsePolynomial(originalPolynomial);
  const reconstructed = multiplyByFactor(userFactor, userRemainders);
  return arePolynomialsEqual(original, reconstructed);
}

/**
 * 카드 정답 자동 도출 — 카드 데이터 검증용.
 * 원본 다항식 → extractCommonFactor → 정답 (factor, remainders) 반환.
 * 카드 큐레이션 시 hand-author 한 commonFactor 와 비교 검증에 사용.
 */
export function deriveAnswer(
  originalPolynomial: string,
): { factor: { coefficient: number; variable: string; exponent: number }; remainders: Polynomial } | null {
  const poly = parsePolynomial(originalPolynomial);
  return extractCommonFactor(poly);
}
