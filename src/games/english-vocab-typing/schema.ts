// english-vocab-typing 카드 스키마 — vocab-typing 과 동일 구조, type literal 만 분리.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const EnglishVocabTypingProblemSchema = z.object({
  /** 한국어 뜻. */
  meaning: z.string().min(1),
  /** 정답 영단어 (소문자 입력 권장). */
  answer: z.string().min(1),
  /** 발음기호 등 보조 (선택). */
  pronunciation: z.string().optional(),
});

export const EnglishVocabTypingCardSchema = CardBaseSchema.extend({
  type: z.literal("english-vocab-typing"),
  problem: EnglishVocabTypingProblemSchema,
});

export type EnglishVocabTypingCard = z.infer<typeof EnglishVocabTypingCardSchema>;
