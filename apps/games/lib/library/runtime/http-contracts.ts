import { z } from "zod";

import { PinnedGameActivitySchema } from "../schemas";

export const LibraryClientSessionSchema = z
  .object({
    launchId: z.string().trim().min(1).max(200),
    anonymousUserId: z.string().trim().min(1).max(200),
    sessionId: z.string().trim().min(1).max(200),
    activity: PinnedGameActivitySchema,
    expiresAt: z.number().int().positive(),
  })
  .strict();

export const LearningEventBatchReceiptSchema = z
  .object({
    acceptedEventIds: z.array(z.string().trim().min(1).max(200)).max(100),
  })
  .strict();

export type LibraryClientSession = z.infer<
  typeof LibraryClientSessionSchema
>;
