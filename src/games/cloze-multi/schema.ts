// 다중 빈칸 cloze 카드 스키마.
// 한 본문 안에 빈칸 N개(2~5) + 카드 풀(정답 N + distractor 0~M).
// 학생은 카드를 빈칸에 배치하고 "정답 확인" 으로 전체 채점.
// english-blank 와 다른 점: 빈칸 N개 + 카드 풀에서 정답 조합 + 카드 자원 한정.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

/** 빈칸 슬롯 — 본문 안 토큰 자리. correctCardId 가 정답 카드. */
const BlankSlotSchema = z.object({
  id: z.string().min(1),
  /** 정답 카드 id (cards[].id 와 매칭). */
  correctCardId: z.string().min(1),
});

/** 보기 카드 — 빈칸에 끼우는 단어/구. distractor 포함. */
const ClozeCardSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

/** 본문 토큰 — 일반 텍스트 또는 빈칸 슬롯. */
const PassageTokenSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().min(1) }),
  z.object({ kind: z.literal("blank"), slotId: z.string().min(1) }),
]);

export const ClozeMultiProblemSchema = z
  .object({
    /** 본문을 토큰으로 분리. text 와 blank 가 섞임. */
    passage: z.array(PassageTokenSchema).min(2),
    /** 빈칸 슬롯 정의 (passage 안 blank token 의 slotId 와 1:1 매칭). */
    blanks: z.array(BlankSlotSchema).min(2).max(5),
    /** 카드 풀 (정답 N + distractor 0~M). 빈칸 수 이상이어야 함. */
    cards: z.array(ClozeCardSchema).min(2),
  })
  .refine(
    (p) => p.cards.length >= p.blanks.length,
    "cards 풀이 blanks 수보다 적으면 안 됨",
  )
  .refine((p) => {
    const cardIds = new Set(p.cards.map((c) => c.id));
    return p.blanks.every((b) => cardIds.has(b.correctCardId));
  }, "blank.correctCardId 가 cards 안에 존재해야 함")
  .refine((p) => {
    const blankIds = new Set(p.blanks.map((b) => b.id));
    const passageBlankIds = p.passage
      .filter((t): t is { kind: "blank"; slotId: string } => t.kind === "blank")
      .map((t) => t.slotId);
    return (
      passageBlankIds.length === p.blanks.length &&
      passageBlankIds.every((id) => blankIds.has(id))
    );
  }, "passage 안 blank 슬롯과 blanks 배열이 1:1 매칭이어야 함");

export const ClozeMultiCardSchema = CardBaseSchema.extend({
  type: z.literal("cloze-multi"),
  problem: ClozeMultiProblemSchema,
});

export type ClozeMultiCard = z.infer<typeof ClozeMultiCardSchema>;
export type ClozeCard = z.infer<typeof ClozeCardSchema>;
export type BlankSlot = z.infer<typeof BlankSlotSchema>;
export type PassageToken = z.infer<typeof PassageTokenSchema>;
