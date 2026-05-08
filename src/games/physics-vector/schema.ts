// physics-vector 카드 스키마 stub — V3 본격 구현 시 보강.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const VectorSchema = z.object({
  /** 시작점. */
  origin: z.tuple([z.number(), z.number()]),
  /** 성분 (x, y). */
  components: z.tuple([z.number(), z.number()]),
  /** 라벨. 예: "F1", "v". */
  label: z.string().min(1),
});

export const VectorProblemSchema = z.object({
  /** 입력 벡터들. */
  vectors: z.array(VectorSchema).min(2).max(3),
  /** 정답 합벡터 — 학생이 그려야 할 결과. */
  resultant: VectorSchema,
  /** 출제 맥락 (예: "이 두 힘이 작용할 때 합력은?"). */
  context: z.string().min(1),
});

export const VectorCardSchema = CardBaseSchema.extend({
  type: z.literal("vector"),
  problem: VectorProblemSchema,
});

export type VectorCard = z.infer<typeof VectorCardSchema>;
