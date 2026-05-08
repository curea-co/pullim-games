// math-graph-shift 카드 스키마 — y = a(x - h)^2 + k 변형 (V3 1차 이차함수만).

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const GraphShiftProblemSchema = z.object({
  /** 시작 함수 표시용 텍스트. 예: "y = x²". */
  startEquation: z.string().min(1),
  /** 목표 함수 표시용 텍스트. 예: "y = (x - 2)² + 3". */
  targetEquation: z.string().min(1),
  /** 정답 a (계수). */
  targetA: z.number(),
  /** 정답 h (가로 평행이동). */
  targetH: z.number(),
  /** 정답 k (세로 평행이동). */
  targetK: z.number(),
});

export const GraphShiftCardSchema = CardBaseSchema.extend({
  type: z.literal("graph-shift"),
  problem: GraphShiftProblemSchema,
});

export type GraphShiftCard = z.infer<typeof GraphShiftCardSchema>;
