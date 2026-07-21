import { afterEach, describe, expect, it, vi } from "vitest";

import type { LearningEvent } from "../types";
import {
  createLibraryEventBatchSender,
  fetchLibraryClientSession,
} from "./http-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const activity = {
  binding: { kind: "game-binding" as const, id: "b", version: "1.0.0" },
  template: {
    kind: "game-template" as const,
    id: "math-quick-quiz",
    version: "1.0.0",
  },
  curriculum: {
    kind: "curriculum-dataset" as const,
    id: "d",
    version: "1.0.0",
  },
  gameId: "math-quick-quiz",
  mode: "default" as const,
};

const event: LearningEvent = {
  schemaVersion: "1.0",
  eventId: "event_01",
  type: "submit",
  ts: 1_784_560_050_000,
  anonymousUserId: "anon_01",
  sessionId: "session_01",
  activity,
  payload: {},
};

describe("Library runtime HTTP client", () => {
  it("route context를 query로 보내 최소 client session을 검증", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          launchId: "launch_01",
          anonymousUserId: "anon_01",
          sessionId: "session_01",
          activity,
          expiresAt: 1_784_560_300_000,
        }),
        { status: 200 },
      ),
    );
    await expect(
      fetchLibraryClientSession(
        "math-quick-quiz",
        "default",
        fetcher as typeof fetch,
      ),
    ).resolves.toMatchObject({ launchId: "launch_01", activity });
    expect(fetcher.mock.calls[0]![0]).toBe(
      "/api/library/launch/session?gameId=math-quick-quiz&mode=default",
    );
  });

  it("CSRF cookie를 echo해 event batch receipt 수신", async () => {
    vi.stubGlobal("document", {
      cookie: "pullim-csrf-library-events=csrf-token",
    });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ acceptedEventIds: ["event_01"] }), {
        status: 200,
      }),
    );
    const sender = createLibraryEventBatchSender(fetcher as typeof fetch);

    await expect(sender.send([event])).resolves.toEqual({
      acceptedEventIds: ["event_01"],
    });
    const options = fetcher.mock.calls[0]![1] as RequestInit;
    expect(options.headers).toMatchObject({
      "x-csrf-token": "csrf-token",
    });
    expect(options.body).toBe(JSON.stringify({ events: [event] }));
  });

  it("403이면 CSRF를 재발급하고 event POST를 한 번만 재시도", async () => {
    vi.stubGlobal("document", {
      cookie: "pullim-csrf-library-events=csrf-token",
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 403 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ acceptedEventIds: ["event_01"] }), {
          status: 200,
        }),
      );
    const sender = createLibraryEventBatchSender(fetcher as typeof fetch);

    await expect(sender.send([event])).resolves.toEqual({
      acceptedEventIds: ["event_01"],
    });
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      "/api/library/events",
      "/api/library/events/csrf",
      "/api/library/events",
    ]);
  });
});
