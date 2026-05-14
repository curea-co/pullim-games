// 자모/문자 조합 카드 스키마.
// 슬롯 N개(2~3) + 부수 카드 풀(정답 N + distractor 0~M).
// V0: 한자 부수 조합. V1+ 에서 한글 자모 / 알파벳 스펠링 으로 확장 가능 (별 game id).

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

const TargetSchema = z.object({
  /** 완성 한자/단어. */
  hanja: z.string().min(1),
  /** 의미(뜻). */
  meaning: z.string().min(1),
  /** 한글 음. */
  reading: z.string().min(1),
});

const SlotSchema = z.object({
  id: z.string().min(1),
  /** 정답 카드 id (cards[].id 와 매칭). */
  correctCardId: z.string().min(1),
});

const ComponentCardSchema = z.object({
  id: z.string().min(1),
  /** 부수/자모/알파벳 표시 텍스트. */
  text: z.string().min(1),
  /** 보조 라벨 (선택 — 한자 부수면 한글 음, 예: "나무 목"). */
  label: z.string().optional(),
});

export const LetterAssemblyProblemSchema = z
  .object({
    target: TargetSchema,
    /** 슬롯 배열 — 좌→우 (V0) 순서로 표시. */
    slots: z.array(SlotSchema).min(2).max(3),
    /** 카드 풀 (정답 N + distractor 0~M). 슬롯 수 이상이어야 함. */
    cards: z.array(ComponentCardSchema).min(2),
  })
  .refine(
    (p) => p.cards.length >= p.slots.length,
    "cards 풀이 slots 수보다 적으면 안 됨",
  )
  .refine((p) => {
    const cardIds = new Set(p.cards.map((c) => c.id));
    return p.slots.every((s) => cardIds.has(s.correctCardId));
  }, "slot.correctCardId 가 cards 안에 존재해야 함");

export const LetterAssemblyCardSchema = CardBaseSchema.extend({
  type: z.literal("letter-assembly"),
  problem: LetterAssemblyProblemSchema,
});

export type LetterAssemblyCard = z.infer<typeof LetterAssemblyCardSchema>;
export type ComponentCard = z.infer<typeof ComponentCardSchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type Target = z.infer<typeof TargetSchema>;
