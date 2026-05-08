// math-graph-shift 카드 스키마 stub — V3 본격 구현 시 보강.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const GraphShiftProblemSchema = z.object({
  /** 시작 함수식. 예: "y = x^2". */
  startEquation: z.string().min(1),
  /** 목표 함수식. 예: "y = (x - 2)^2 + 3". */
  targetEquation: z.string().min(1),
  /** 허용 변형 종류. */
  allowedTransforms: z.array(
    z.enum(["translate-x", "translate-y", "scale-x", "scale-y", "reflect"]),
  ),
});

export const GraphShiftCardSchema = CardBaseSchema.extend({
  type: z.literal("graph-shift"),
  problem: GraphShiftProblemSchema,
});

export type GraphShiftCard = z.infer<typeof GraphShiftCardSchema>;
