import "server-only";

import { createHash } from "node:crypto";

import type { LearningEvent } from "@/lib/library";
import { query, withTx, type QueryFn } from "@/lib/server/db/client";
import { canonicalizeArtifact } from "./integrity";

export const LIBRARY_EVENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1_000;

export class LearningEventIdConflictError extends Error {
  constructor(readonly eventId: string) {
    super("같은 eventId에 서로 다른 LearningEvent가 이미 저장되어 있습니다.");
    this.name = "LearningEventIdConflictError";
  }
}

function hashEvent(event: LearningEvent): string {
  return createHash("sha256")
    .update(canonicalizeArtifact(event))
    .digest("hex");
}

export type TransactionRunner = <T>(
  fn: (exec: QueryFn) => Promise<T>,
) => Promise<T>;

export async function storeLibraryLearningEvents(
  launchId: string,
  events: readonly LearningEvent[],
  transaction: TransactionRunner = withTx,
  now = Date.now(),
): Promise<readonly string[]> {
  return transaction(async (exec) => {
    for (const event of events) {
      const eventHash = hashEvent(event);
      const result = await exec<{ event_id: string }>(
        `INSERT INTO library_learning_events
           (event_id, event_hash, launch_id, anonymous_user_id, session_id,
            game_id, mode, event_type, occurred_at, event_envelope, received_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (event_id) DO UPDATE
           SET event_id = EXCLUDED.event_id
         WHERE library_learning_events.event_hash = EXCLUDED.event_hash
         RETURNING event_id`,
        [
          event.eventId,
          eventHash,
          launchId,
          event.anonymousUserId,
          event.sessionId,
          event.activity.gameId,
          event.activity.mode,
          event.type,
          event.ts,
          JSON.stringify(event),
          now,
        ],
      );
      if (result.rowCount !== 1) {
        throw new LearningEventIdConflictError(event.eventId);
      }
    }
    return events.map((event) => event.eventId);
  });
}

export async function purgeStaleLibraryLearningEvents(
  now = Date.now(),
  exec: QueryFn = query,
): Promise<number> {
  const cutoff = now - LIBRARY_EVENT_RETENTION_MS;
  const result = await exec(
    "DELETE FROM library_learning_events WHERE received_at < $1",
    [cutoff],
  );
  return result.rowCount;
}
