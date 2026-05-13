// 생물 분류 카드 스키마 — 카테고리 2~4개 + 카드 6~10장 + 정답 매핑.
// V0: 멘델·5계·척추동물 등 단원 다양화. 윤리·사회 분류는 V1+ 별 게임.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

const CategorySchema = z.object({
  /** 카테고리 안정 id (예: "vertebrate", "fish"). */
  id: z.string().min(1),
  /** UI 라벨 (예: "척추동물", "어류"). */
  label: z.string().min(1),
});

const ItemSchema = z.object({
  /** 카드 안정 id. */
  id: z.string().min(1),
  /** UI 라벨 (예: "잉어", "고사리"). */
  label: z.string().min(1),
  /** 정답 categoryId. CategorySchema.id 중 하나와 일치해야 함. */
  categoryId: z.string().min(1),
});

export const BioTaxonomyProblemSchema = z
  .object({
    /** 분류 기준 라벨 (예: "동물·식물·균류"). 헤더 표시용. */
    title: z.string().min(1),
    categories: z.array(CategorySchema).min(2).max(4),
    items: z.array(ItemSchema).min(4).max(10),
  })
  .refine(
    (problem) => {
      const ids = new Set(problem.categories.map((c) => c.id));
      return problem.items.every((i) => ids.has(i.categoryId));
    },
    { message: "items.categoryId 가 categories.id 와 일치해야 함" },
  );

export const BioTaxonomyCardSchema = CardBaseSchema.extend({
  type: z.literal("bio-taxonomy"),
  problem: BioTaxonomyProblemSchema,
});

export type BioTaxonomyCard = z.infer<typeof BioTaxonomyCardSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Item = z.infer<typeof ItemSchema>;
