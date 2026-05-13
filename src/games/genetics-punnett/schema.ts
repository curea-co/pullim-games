// 펀넷 사각형 카드 스키마 — 부모 유전자형 + 형질 정보 + 정답 표현형 비율.
// V0: 멘델 우성/열성 모델 (단성/양성잡종 자손·검정교배).
//   - 불완전우성·치사·복대립은 V1 이후 traits 모델 확장 시 도입.
//   - 표현형 카테고리는 traits 의 dominant/recessive 2^N 조합 (순서: A_B_, A_bb, aaB_, aabb).

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

const TraitSchema = z.object({
  /** 형질 라벨. 예: "씨앗 색", "씨앗 모양". */
  name: z.string().min(1),
  /** 대립유전자 심볼 (대문자 = 우성). 예: "A". */
  symbol: z.string().min(1).max(1),
  /** 우성 표현형. 예: "노란색". */
  dominant: z.string().min(1),
  /** 열성 표현형. 예: "초록색". */
  recessive: z.string().min(1),
});

export const PunnettProblemSchema = z.object({
  /** 부모 1 유전자형. 예: "AaBb" (양성잡종) 또는 "Aa" (단성잡종). */
  p1: z.string().min(2),
  /** 부모 2 유전자형. p1 과 동일 형질 수. */
  p2: z.string().min(2),
  /** 형질 정보 (1쌍 또는 2쌍). p1·p2 의 심볼과 일치해야 함. */
  traits: z.array(TraitSchema).min(1).max(2),
  /** 정답 표현형 비율. 길이 = 2^(traits.length). 약분된 형태. */
  expectedRatio: z.array(z.number().int().min(0)).min(2).max(4),
});

export const PunnettCardSchema = CardBaseSchema.extend({
  type: z.literal("genetics-punnett"),
  problem: PunnettProblemSchema,
});

export type PunnettCard = z.infer<typeof PunnettCardSchema>;
export type Trait = z.infer<typeof TraitSchema>;
