// english-blank 카드 스키마 stub — V3 본격 구현 시 보강.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const BlankProblemSchema = z.object({
  /** 본문 — 빈칸 자리에 `___` 토큰. */
  passage: z.string().min(20),
  /** 4지선다 보기. */
  choices: z.array(z.string().min(1)).length(4),
  /** 정답 인덱스. */
  correctIndex: z.number().int().min(0).max(3),
  /** 출제 의도/해설 (오답 시 표시). */
  rationale: z.string().optional(),
});

export const BlankCardSchema = CardBaseSchema.extend({
  type: z.literal("blank"),
  problem: BlankProblemSchema,
});

export type BlankCard = z.infer<typeof BlankCardSchema>;
