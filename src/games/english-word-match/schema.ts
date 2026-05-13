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
   * 함정 옵션 — pairs 외에 옵션 풀에 섞임. 매칭 시도 시 wrong-flash.
   * 의미 유사 단어 권장 (retrieval 강화). 양쪽 균형 잡힐 필요 없음.
   * `proc/plan/2026-05-13_game-discrimination-phase3.md` I1.
   */
  extras: z
    .object({
      english: z.array(z.string()).optional(),
      korean: z.array(z.string()).optional(),
    })
    .optional(),
});

export const WordMatchCardSchema = CardBaseSchema.extend({
  type: z.literal("word-match"),
  problem: WordMatchProblemSchema,
});

export type WordMatchCard = z.infer<typeof WordMatchCardSchema>;
