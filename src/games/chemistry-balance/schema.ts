// chemistry-balance 카드 스키마 stub — V2 본격 구현 시 보강.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const MoleculeSchema = z.object({
  /** 화학식. 예: "H2O", "Fe2O3". */
  formula: z.string().min(1),
  /** 정답 계수 (학생이 맞춰야 할 값). */
  coefficient: z.number().int().positive(),
});

export const ChemistryBalanceProblemSchema = z.object({
  /** 좌변 분자들. */
  reactants: z.array(MoleculeSchema).min(1).max(3),
  /** 우변 분자들. */
  products: z.array(MoleculeSchema).min(1).max(3),
});

export const ChemistryBalanceCardSchema = CardBaseSchema.extend({
  type: z.literal("chemistry-balance"),
  problem: ChemistryBalanceProblemSchema,
});

export type ChemistryBalanceCard = z.infer<typeof ChemistryBalanceCardSchema>;
