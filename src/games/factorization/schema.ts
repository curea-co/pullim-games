// 인수분해 게임 카드 스키마 — CardBaseSchema 를 type='factorization-block'으로 narrow.
// Phase 1 V0.1: 공통인수 묶기 메커닉만. V0.2에서 합곱·삼차차·치환 등 다른 단원 추가 시
// type 추가 + discriminated union 으로 확장.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const FactorizationProblemSchema = z.object({
  /** 문제로 표시되는 다항식 텍스트. 예: "2x + 4". */
  polynomial: z.string().min(1),

  /** 풀이 후 표시되는 인수분해 형태. 예: "2(x + 2)". */
  factoredForm: z.string().min(1),

  /** 공통인수 (힌트/디버그용). 예: "2". */
  commonFactor: z.string().min(1),
});

export const FactorizationCardSchema = CardBaseSchema.extend({
  type: z.literal("factorization-block"),
  problem: FactorizationProblemSchema,
});

export type FactorizationCard = z.infer<typeof FactorizationCardSchema>;
