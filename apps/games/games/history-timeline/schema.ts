// history-timeline 카드 스키마 stub — V2 본격 구현 시 보강.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const TimelineProblemSchema = z.object({
  /** 시대 라벨 — 화면 상단 표시. 예: "조선 후기 ~ 대한제국". */
  era: z.string().min(1),
  /** 사건 카드 — 정답 시간 순. */
  events: z
    .array(
      z.object({
        title: z.string().min(1),
        year: z.number().int(),
      }),
    )
    .min(3)
    .max(6),
});

export const TimelineCardSchema = CardBaseSchema.extend({
  type: z.literal("timeline"),
  problem: TimelineProblemSchema,
});

export type TimelineCard = z.infer<typeof TimelineCardSchema>;
