// 학생 태깅 vs 정답 token-by-token 비교.
// 부분 정답률 산출 — wrong phase 에서 정확도 표시 + FSRS rating 결정에 활용.

import type { KoreanPos, Token } from "../schema";

export interface TaggingResult {
  /** 모든 토큰이 정답이면 true. */
  allCorrect: boolean;
  /** 정답 토큰 수. */
  correctCount: number;
  /** 총 토큰 수. */
  totalCount: number;
  /** 토큰별 정/오 결과 (UI 색칠용). */
  perToken: boolean[];
}

export function checkTagging(
  input: (KoreanPos | null)[],
  tokens: Token[],
): TaggingResult {
  if (input.length !== tokens.length) {
    throw new Error(
      `[korean-pos-tagging] input length ${input.length} != tokens length ${tokens.length}`,
    );
  }
  const perToken = tokens.map((t, i) => input[i] === t.pos);
  const correctCount = perToken.filter(Boolean).length;
  return {
    allCorrect: correctCount === tokens.length,
    correctCount,
    totalCount: tokens.length,
    perToken,
  };
}
