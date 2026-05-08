// 인수분해 게임 카드 스키마 — CardBaseSchema 를 type='factorization-block'으로 narrow.
// SPEC §08.8 Block Tokenization 따라 term 단위 + part 단위 표현.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

const PartSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  isCommon: z.boolean(),
});

const TermSchema = z.object({
  id: z.string().min(1),
  parts: z.array(PartSchema).min(1),
});

export const FactorizationProblemSchema = z.object({
  /** 표시용 다항식 텍스트 (디버그/메타용). 예: "2x + 4". */
  polynomial: z.string().min(1),

  /** Term 단위 블록 표현. SPEC §08.8. */
  terms: z.array(TermSchema).min(2),

  /** 공통인수 텍스트 (추출 시 외부 factor 로 표시). 예: "2". */
  commonFactor: z.string().min(1),

  /** 인수분해 완료 형태 (백업 표시·로깅용). 예: "2(x + 2)". */
  factoredForm: z.string().min(1),
});

export const FactorizationCardSchema = CardBaseSchema.extend({
  type: z.literal("factorization-block"),
  problem: FactorizationProblemSchema,
});

export type FactorizationCard = z.infer<typeof FactorizationCardSchema>;
