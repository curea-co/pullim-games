// english-order 카드 스키마 — 한국어→영어 어순 정렬.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const WordOrderProblemSchema = z.object({
  /** 한국어 원문 — 화면 상단 표시. */
  korean: z.string().min(1),
  /** 정답 영어 — 단어별 배열. 길이가 슬롯 수. */
  english: z.array(z.string().min(1)).min(2),
});

export const WordOrderCardSchema = CardBaseSchema.extend({
  type: z.literal("word-order"),
  problem: WordOrderProblemSchema,
});

export type WordOrderCard = z.infer<typeof WordOrderCardSchema>;
