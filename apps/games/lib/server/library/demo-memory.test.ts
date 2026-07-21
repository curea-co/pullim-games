import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LearningEvent } from "@/lib/library";
import {
  createDemoLibraryLaunchSession,
  getDemoLibraryLaunchSession,
  isLibraryDemoEnabled,
  isLibraryDemoLaunchToken,
  resetDemoLibraryMemory,
  storeDemoLibraryLearningEvents,
} from "./demo-memory";
import { LearningEventIdConflictError } from "./events";

const NOW = 1_784_560_000_000;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  resetDemoLibraryMemory();
});

afterEach(() => {
  resetDemoLibraryMemory();
  vi.unstubAllEnvs();
});

function eventFor(
  launch: ReturnType<typeof createDemoLibraryLaunchSession>["session"],
): LearningEvent {
  return {
    schemaVersion: "1.0",
    eventId: "event_demo_01",
    type: "session-start",
    ts: NOW + 1_000,
    anonymousUserId: launch.anonymousUserId,
    sessionId: launch.sessionId,
    activity: launch.activity,
    payload: {},
  };
}

describe("개발용 Library memory adapter", () => {
  it("익명·버전 고정 session을 만들고 만료 전까지만 조회", () => {
    const demo = createDemoLibraryLaunchSession(NOW);

    expect(isLibraryDemoEnabled()).toBe(true);
    expect(isLibraryDemoLaunchToken(demo.token)).toBe(true);
    expect(demo.session.anonymousUserId).toMatch(/^anon-demo-/);
    expect(demo.session.activity.binding.version).toBe("demo-2026.07.22");
    expect(getDemoLibraryLaunchSession(demo.token, NOW)).toEqual(demo.session);
    expect(getDemoLibraryLaunchSession(demo.token, demo.expiresAt)).toBeNull();
  });

  it("동일 eventId/동일 본문은 멱등 수락하고 다른 본문은 충돌", () => {
    const { session } = createDemoLibraryLaunchSession(NOW);
    const event = eventFor(session);

    expect(storeDemoLibraryLearningEvents(session.launchId, [event], NOW)).toEqual([
      event.eventId,
    ]);
    expect(storeDemoLibraryLearningEvents(session.launchId, [event], NOW)).toEqual([
      event.eventId,
    ]);
    expect(() =>
      storeDemoLibraryLearningEvents(
        session.launchId,
        [{ ...event, payload: { retry: true } }],
        NOW,
      ),
    ).toThrowError(LearningEventIdConflictError);
  });

  it("production에서는 발급과 메모리 저장소 접근을 차단", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isLibraryDemoEnabled()).toBe(false);
    expect(() => createDemoLibraryLaunchSession(NOW)).toThrow(
      "library_demo_disabled",
    );
    expect(getDemoLibraryLaunchSession("demo_forged", NOW)).toBeNull();
  });
});
