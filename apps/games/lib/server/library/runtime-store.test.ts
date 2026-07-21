import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/library/demo-memory", () => ({
  getDemoLibraryLaunchSession: vi.fn(),
  isLibraryDemoLaunchToken: vi.fn(),
  storeDemoLibraryLearningEvents: vi.fn(),
}));
vi.mock("@/lib/server/library/session", () => ({
  getLibraryLaunchSession: vi.fn(),
}));
vi.mock("@/lib/server/library/events", () => ({
  storeLibraryLearningEvents: vi.fn(),
}));

import type { LearningEvent } from "@/lib/library";
import {
  getDemoLibraryLaunchSession,
  isLibraryDemoLaunchToken,
  storeDemoLibraryLearningEvents,
} from "@/lib/server/library/demo-memory";
import { storeLibraryLearningEvents } from "@/lib/server/library/events";
import {
  getLibraryLaunchSession,
  type LibraryLaunchSession,
} from "@/lib/server/library/session";
import {
  persistLibraryLearningEvents,
  resolveLibraryLaunchSession,
} from "./runtime-store";

const session = { launchId: "launch_01" } as LibraryLaunchSession;
const events = [{ eventId: "event_01" }] as LearningEvent[];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Library runtime store routing", () => {
  it("demo token은 DB를 조회하지 않고 memory session으로 해석", async () => {
    vi.mocked(isLibraryDemoLaunchToken).mockReturnValue(true);
    vi.mocked(getDemoLibraryLaunchSession).mockReturnValue(session);

    await expect(resolveLibraryLaunchSession("demo_token")).resolves.toEqual({
      source: "demo-memory",
      session,
    });
    expect(getLibraryLaunchSession).not.toHaveBeenCalled();
  });

  it("일반 opaque token은 기존 DB session 경로를 유지", async () => {
    vi.mocked(isLibraryDemoLaunchToken).mockReturnValue(false);
    vi.mocked(getLibraryLaunchSession).mockResolvedValue(session);

    await expect(resolveLibraryLaunchSession("opaque")).resolves.toEqual({
      source: "database",
      session,
    });
  });

  it("session source와 같은 event adapter에만 저장", async () => {
    vi.mocked(storeDemoLibraryLearningEvents).mockReturnValue(["event_01"]);
    vi.mocked(storeLibraryLearningEvents).mockResolvedValue(["event_01"]);

    await persistLibraryLearningEvents(
      { source: "demo-memory", session },
      events,
    );
    expect(storeDemoLibraryLearningEvents).toHaveBeenCalledWith(
      session.launchId,
      events,
    );
    expect(storeLibraryLearningEvents).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await persistLibraryLearningEvents(
      { source: "database", session },
      events,
    );
    expect(storeLibraryLearningEvents).toHaveBeenCalledWith(
      session.launchId,
      events,
    );
  });
});
