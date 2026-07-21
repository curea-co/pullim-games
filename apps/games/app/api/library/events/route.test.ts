import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/library/session", () => ({
  readLibraryLaunchToken: vi.fn(),
}));
vi.mock("@/lib/server/library/events", () => {
  class LearningEventIdConflictError extends Error {
    constructor(readonly eventId: string) {
      super("conflict");
    }
  }
  return {
    LearningEventIdConflictError,
  };
});
vi.mock("@/lib/server/library/runtime-store", () => ({
  persistLibraryLearningEvents: vi.fn(),
  resolveLibraryLaunchSession: vi.fn(),
}));

import { POST } from "./route";
import type { LearningEvent } from "@/lib/library";
import { libraryEventsCsrf } from "@/lib/server/library/csrf";
import { LearningEventIdConflictError } from "@/lib/server/library/events";
import {
  persistLibraryLearningEvents,
  resolveLibraryLaunchSession,
} from "@/lib/server/library/runtime-store";
import { readLibraryLaunchToken } from "@/lib/server/library/session";

const ORIGIN = "http://localhost:3033";
const NOW_SECONDS = 1_784_560_050;
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
const launch = {
  tokenVersion: "1.0",
  iss: "pullim-library",
  aud: "pullim-games",
  sub: "anon_01",
  launchId: "launch_01",
  iat: NOW_SECONDS - 50,
  exp: NOW_SECONDS + 250,
  anonymousUserId: "anon_01",
  sessionId: "session_01",
  activity,
};
const learningEvent: LearningEvent = {
  schemaVersion: "1.0",
  eventId: "event_01",
  type: "submit",
  ts: NOW_SECONDS * 1_000,
  anonymousUserId: "anon_01",
  sessionId: "session_01",
  activity,
  payload: { correct: true },
};

function request(
  body: unknown = { events: [learningEvent] },
  options: { origin?: boolean; csrf?: boolean } = {},
) {
  const { token } = libraryEventsCsrf.issue();
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.origin !== false) headers.origin = ORIGIN;
  if (options.csrf !== false) {
    headers.cookie = `pullim_games_library_launch=opaque; pullim-csrf-library-events=${token}`;
    headers["x-csrf-token"] = token;
  }
  return new Request(`${ORIGIN}/api/library/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readLibraryLaunchToken).mockReturnValue("opaque");
  vi.mocked(resolveLibraryLaunchSession).mockResolvedValue({
    source: "database",
    session: launch,
  } as never);
  vi.mocked(persistLibraryLearningEvents).mockResolvedValue(["event_01"]);
});

describe("POST /api/library/events", () => {
  it("session과 일치하는 batch를 저장하고 accepted IDs 반환", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(persistLibraryLearningEvents).toHaveBeenCalledWith(
      expect.objectContaining({ source: "database", session: launch }),
      [learningEvent],
    );
    await expect(response.json()).resolves.toEqual({
      acceptedEventIds: ["event_01"],
    });
  });

  it("origin/CSRF 부재를 DB 접근 전에 거부", async () => {
    expect((await POST(request(undefined, { origin: false }))).status).toBe(403);
    expect((await POST(request(undefined, { csrf: false }))).status).toBe(403);
    expect(resolveLibraryLaunchSession).not.toHaveBeenCalled();
  });

  it("익명 ID/session/activity/timestamp mismatch를 403으로 거부", async () => {
    const mismatched = {
      ...learningEvent,
      anonymousUserId: "anon_other",
    };
    expect((await POST(request({ events: [mismatched] }))).status).toBe(403);
    expect(persistLibraryLearningEvents).not.toHaveBeenCalled();
  });

  it("batch 내부 eventId 중복은 422", async () => {
    const response = await POST(
      request({ events: [learningEvent, learningEvent] }),
    );
    expect(response.status).toBe(422);
  });

  it("같은 eventId/다른 본문 conflict는 409", async () => {
    vi.mocked(persistLibraryLearningEvents).mockRejectedValueOnce(
      new LearningEventIdConflictError("event_01"),
    );
    const response = await POST(request());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "event_id_conflict",
      eventId: "event_01",
    });
  });
});
