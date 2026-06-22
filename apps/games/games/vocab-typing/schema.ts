// vocab-typing 카드 스키마 stub — V2 본격 구현 시 보강.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const VocabTypingProblemSchema = z.object({
  /** 뜻풀이 — 화면 상단 표시. 예: "어떤 일을 책임지고 맡아 함". */
  meaning: z.string().min(1),
  /** 정답 어휘 (한자 또는 한글). 예: "擔當" 또는 "담당". */
  answer: z.string().min(1),
  /** 한자 어휘면 한글 음 보조 표시. */
  pronunciation: z.string().optional(),
});

export const VocabTypingCardSchema = CardBaseSchema.extend({
  type: z.literal("vocab-typing"),
  problem: VocabTypingProblemSchema,
});

export type VocabTypingCard = z.infer<typeof VocabTypingCardSchema>;
