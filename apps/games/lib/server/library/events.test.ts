import { describe, expect, it, vi } from "vitest";

import type { LearningEvent } from "@/lib/library";
import type { QueryFn } from "@/lib/server/db/client";
import {
  LearningEventIdConflictError,
  LIBRARY_EVENT_RETENTION_MS,
  purgeStaleLibraryLearningEvents,
  storeLibraryLearningEvents,
} from "./events";

function event(eventId = "event_01"): LearningEvent {
  return {
    schemaVersion: "1.0",
    eventId,
    type: "submit",
    ts: 1_784_560_050_000,
    anonymousUserId: "anon_01",
    sessionId: "session_01",
    activity: {
      binding: { kind: "game-binding", id: "b", version: "1.0.0" },
      template: {
        kind: "game-template",
        id: "math-quick-quiz",
        version: "1.0.0",
      },
      curriculum: {
        kind: "curriculum-dataset",
        id: "d",
        version: "1.0.0",
      },
      gameId: "math-quick-quiz",
      mode: "default",
    },
    itemId: "card-01",
    payload: { correct: true },
  };
}

describe("Library LearningEvent persistence", () => {
  it("주입 transaction에서 eventId/hash/envelope를 저장하고 accepted ID 반환", async () => {
    const exec = vi.fn().mockResolvedValue({
      rows: [{ event_id: "event_01" }],
      rowCount: 1,
    });
    const transaction = async <T>(fn: (q: QueryFn) => Promise<T>) =>
      fn(exec as QueryFn);

    await expect(
      storeLibraryLearningEvents(
        "launch_01",
        [event()],
        transaction,
        1_784_560_060_000,
      ),
    ).resolves.toEqual(["event_01"]);
    const params = exec.mock.calls[0]![1] as unknown[];
    expect(params[0]).toBe("event_01");
    expect(params[1]).toMatch(/^[0-9a-f]{64}$/);
    expect(params[2]).toBe("launch_01");
    expect(params[9]).toBe(JSON.stringify(event()));
  });

  it("같은 eventId/다른 hash conflict를 명시 오류로 반환", async () => {
    const transaction = async <T>(fn: (q: QueryFn) => Promise<T>) =>
      fn(vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) as QueryFn);
    await expect(
      storeLibraryLearningEvents("launch_01", [event()], transaction),
    ).rejects.toBeInstanceOf(LearningEventIdConflictError);
  });

  it("6개월 수신 시각 cutoff로 cleanup", async () => {
    const exec = vi.fn().mockResolvedValue({ rows: [], rowCount: 3 });
    const now = 1_800_000_000_000;
    await expect(
      purgeStaleLibraryLearningEvents(now, exec as QueryFn),
    ).resolves.toBe(3);
    expect(exec.mock.calls[0]![1]).toEqual([
      now - LIBRARY_EVENT_RETENTION_MS,
    ]);
  });
});
