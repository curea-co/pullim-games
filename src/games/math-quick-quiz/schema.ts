// math-quick-quiz 카드 스키마 — 4지선다 단답.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const QuickQuizProblemSchema = z.object({
  question: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

export const QuickQuizCardSchema = CardBaseSchema.extend({
  type: z.literal("multiple-choice"),
  problem: QuickQuizProblemSchema,
});

export type QuickQuizCard = z.infer<typeof QuickQuizCardSchema>;
