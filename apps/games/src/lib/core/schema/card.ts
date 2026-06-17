// 카드 마스터 — 모든 게임이 공유하는 base 스키마.
// 각 게임은 자기 type discriminator + problem 형태로 narrow한다.
// SPEC §05 §5.3 ERD 따름.

import { z } from "zod";

/** 모든 카드가 공유하는 base 필드. */
export const CardBaseSchema = z.object({
  /** UUID 또는 게임별 stable id (예: 'card-001'). */
  id: z.string().min(1),

  /** 게임 type discriminator (예: 'factorization-block', 'multiple-choice'). */
  type: z.string().min(1),

  /** 단원 라벨 (FSRS 우선순위 큐가 unit별 R 분포 분석에 사용). */
  unit: z.string().min(1),

  /** 난이도 시드 1~5 (콘텐츠 큐레이터 할당). FSRS D는 사용자 응답으로 적응. */
  difficultySeed: z.number().int().min(1).max(5),

  /** 게임에 표시할 한 줄 힌트 (선택). */
  hint: z.string().optional(),
});

export type CardBase = z.infer<typeof CardBaseSchema>;

/**
 * 게임 모듈이 자기 카드 스키마를 정의할 때 base를 extends.
 *
 * 사용 예 (factorization 게임):
 * ```ts
 * import { CardBaseSchema } from "@/lib/core/schema/card";
 * import { z } from "zod";
 *
 * export const FactorizationCardSchema = CardBaseSchema.extend({
 *   type: z.literal("factorization-block"),
 *   problem: z.object({
 *     polynomial: z.string(),
 *     expectedFactor: z.string(),
 *   }),
 * });
 * ```
 */
