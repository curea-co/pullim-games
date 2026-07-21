import "server-only";

import { z } from "zod";

import {
  GameModeSchema,
  LearningEventSchema,
} from "@/lib/library";

export const LibraryEventBatchSchema = z
  .object({
    events: z.array(LearningEventSchema).min(1).max(100),
  })
  .strict()
  .superRefine((batch, context) => {
    const ids = new Set<string>();
    for (const [index, event] of batch.events.entries()) {
      if (ids.has(event.eventId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["events", index, "eventId"],
          message: "한 batch 안에서 eventId는 중복될 수 없습니다.",
        });
      }
      ids.add(event.eventId);
    }
  });

export const LibrarySessionQuerySchema = z
  .object({
    gameId: z.string().trim().min(1).max(200),
    mode: GameModeSchema.default("default"),
  })
  .strict();
