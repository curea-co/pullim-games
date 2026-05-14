// english-word-match 카드 스키마 stub — V2 본격 구현 시 보강.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const WordMatchPairSchema = z.object({
  english: z.string().min(1),
  korean: z.string().min(1),
});

export const WordMatchProblemSchema = z.object({
  /** 매칭할 단어 짝 풀. UI 는 양 측을 셔플해 표시. */
  pairs: z.array(WordMatchPairSchema).min(4).max(8),
  /**
   * 추가 짝 — pairs 외 옵션 풀에 섞여서 표시. english[i] ↔ korean[i] 가 의미상 정답 짝.
   * 통과 조건은 pairs 매칭으로 충족되지만, 사용자가 의지가 있으면 extras 도 매칭 가능.
   * 학습 효과 강화 (retrieval): 의미상 가까운 단어를 같이 두면 식별 연습 됨.
   * 양쪽 길이가 같아야 (en[i] ↔ ko[i] 1:1).
   * `proc/plan/2026-05-13_game-discrimination-phase3.md` I1.
   */
  extras: z
    .object({
      english: z.array(z.string()),
      korean: z.array(z.string()),
    })
    .refine((e) => e.english.length === e.korean.length, {
      message: "extras.english 와 extras.korean 의 길이가 같아야 합니다",
    })
    .optional(),
});

export const WordMatchCardSchema = CardBaseSchema.extend({
  type: z.literal("word-match"),
  problem: WordMatchProblemSchema,
});

export type WordMatchCard = z.infer<typeof WordMatchCardSchema>;
