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
});

export const WordMatchCardSchema = CardBaseSchema.extend({
  type: z.literal("word-match"),
  problem: WordMatchProblemSchema,
});

export type WordMatchCard = z.infer<typeof WordMatchCardSchema>;
