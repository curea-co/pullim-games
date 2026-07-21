import { afterEach, describe, expect, it, vi } from "vitest";

import type { LearningEvent } from "../types";
import { logEvent } from "@/lib/core/event/logger";
import type { ResolvedLibraryLaunch } from "./launch";
import {
  createLearningEventQueueStore,
  LearningEventQueue,
  type KeyValueStorage,
} from "./event-queue";
import {
  createLearningEvent,
  createLibraryLearningEventBridge,
  installLibraryLearningEventBridge,
  learningEventFromLogObservation,
} from "./events";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function createLaunch(): ResolvedLibraryLaunch {
  const activity = {
    binding: {
      kind: "game-binding" as const,
      id: "math-quick-quiz-default",
      version: "1.0.0",
    },
    template: {
      kind: "game-template" as const,
      id: "math-quick-quiz",
      version: "1.0.0",
    },
    curriculum: {
      kind: "curriculum-dataset" as const,
      id: "math-quick-quiz-cards",
      version: "2026.07.1",
    },
    gameId: "math-quick-quiz",
    mode: "default" as const,
  };
  return {
    source: "library",
    payload: {
      tokenVersion: "1.0",
      iss: "pullim-library",
      aud: "pullim-games",
      sub: "anon_01",
      jti: "launch_01",
      iat: 1_784_560_000,
      exp: 1_784_560_300,
      anonymousUserId: "anon_01",
      sessionId: "session_01",
      activity,
    },
    binding: {
      kind: "game-binding",
      schemaVersion: "1.0",
      id: activity.binding.id,
      version: activity.binding.version,
      gameId: activity.gameId,
      mode: activity.mode,
      template: activity.template,
      curriculum: activity.curriculum,
      slots: [],
    },
    template: {
      kind: "game-template",
      schemaVersion: "1.0",
      id: activity.template.id,
      version: activity.template.version,
      title: "수학 빠른 퀴즈",
      runtime: {
        kind: "registered-game",
        gameId: activity.gameId,
        protocolVersion: "1.0.0",
        mechanismComponent: "QuickQuiz",
      },
      curriculumSlots: [],
      supportedModes: ["default"],
    },
    curriculum: {
      kind: "curriculum-dataset",
      schemaVersion: "1.0",
      id: activity.curriculum.id,
      version: activity.curriculum.version,
      title: "수학 빠른 퀴즈",
      locale: "ko-KR",
      scope: { kind: "registered-game", gameId: activity.gameId },
      items: [],
    },
  };
}

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("LearningEvent runtime bridge", () => {
  it("launch 익명 ID·고정 activity와 enqueue 시 한 번 만든 eventId를 복사", () => {
    const event = createLearningEvent(
      createLaunch(),
      {
        type: "learning.attempted",
        itemId: "card-01",
        payload: { correct: true },
      },
      {
        createEventId: () => "event_01",
        now: () => 1_784_560_050_000,
      },
    );

    expect(event).toMatchObject({
      eventId: "event_01",
      anonymousUserId: "anon_01",
      sessionId: "session_01",
      itemId: "card-01",
      activity: { gameId: "math-quick-quiz", mode: "default" },
    });
  });

  it("기존 log 관찰값의 action/card/timestamp를 LearningEvent로 변환", () => {
    const event = learningEventFromLogObservation(
      createLaunch(),
      {
        input: {
          gameId: "math-quick-quiz",
          cardId: "card-01",
          action: "submit",
          payload: { correct: false },
        },
        timestampMs: 1_784_560_060_000,
      },
      { createEventId: () => "event_submit_01" },
    );

    expect(event).toMatchObject({
      eventId: "event_submit_01",
      type: "submit",
      itemId: "card-01",
      ts: 1_784_560_060_000,
      payload: { correct: false },
    });
  });

  it("전송 실패 후 같은 eventId로 재시도하고 성공 확인 뒤에만 제거", async () => {
    const storage = createMemoryStorage();
    const sender = {
      send: vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockImplementationOnce(async (events: readonly LearningEvent[]) => ({
          acceptedEventIds: events.map((event) => event.eventId),
        })),
    };
    const queue = new LearningEventQueue(
      createLearningEventQueueStore(storage),
      sender,
    );
    const event = createLearningEvent(
      createLaunch(),
      { type: "learning.completed", payload: {} },
      { createEventId: () => "event_retry_01" },
    );
    queue.enqueue(event);

    await expect(queue.flush()).rejects.toThrow("offline");
    expect(queue.pendingCount).toBe(1);
    expect(queue.snapshot()[0]!.eventId).toBe("event_retry_01");

    await expect(queue.flush()).resolves.toEqual({
      attempted: 1,
      accepted: 1,
      pending: 0,
    });
    expect(sender.send.mock.calls[0]![0][0].eventId).toBe("event_retry_01");
    expect(sender.send.mock.calls[1]![0][0].eventId).toBe("event_retry_01");
  });

  it("부분 성공은 accepted eventId만 제거하고 나머지를 유지", async () => {
    const sender = {
      send: vi.fn().mockResolvedValue({ acceptedEventIds: ["event_a"] }),
    };
    const queue = new LearningEventQueue(
      createLearningEventQueueStore(createMemoryStorage()),
      sender,
    );
    queue.enqueue(
      createLearningEvent(
        createLaunch(),
        { type: "learning.attempted", payload: {} },
        { createEventId: () => "event_a" },
      ),
    );
    queue.enqueue(
      createLearningEvent(
        createLaunch(),
        { type: "learning.attempted", payload: {} },
        { createEventId: () => "event_b" },
      ),
    );

    await expect(queue.flush()).resolves.toEqual({
      attempted: 2,
      accepted: 1,
      pending: 1,
    });
    expect(queue.snapshot().map((event) => event.eventId)).toEqual([
      "event_b",
    ]);
  });

  it("같은 eventId의 동일 이벤트는 중복 저장하지 않고 다른 이벤트 충돌은 거부", () => {
    const queue = new LearningEventQueue(
      createLearningEventQueueStore(createMemoryStorage()),
      { send: vi.fn().mockResolvedValue({ acceptedEventIds: [] }) },
    );
    const event = createLearningEvent(
      createLaunch(),
      { type: "session.completed", payload: {} },
      { createEventId: () => "event_once", now: () => 100 },
    );

    queue.enqueue(event);
    queue.enqueue(event);
    expect(queue.pendingCount).toBe(1);
    expect(() => queue.enqueue({ ...event, ts: 101 })).toThrow(
      "같은 eventId",
    );
  });

  it("bridge emit은 영속 enqueue 뒤 비동기 flush", async () => {
    let release: (() => void) | undefined;
    const sender = {
      send: vi.fn().mockImplementation(
        () =>
          new Promise<{ acceptedEventIds: string[] }>((resolve) => {
            release = () => resolve({ acceptedEventIds: [] });
          }),
      ),
    };
    const queue = new LearningEventQueue(
      createLearningEventQueueStore(createMemoryStorage()),
      sender,
    );
    const bridge = createLibraryLearningEventBridge(createLaunch(), queue, {
      createEventId: () => "event_once",
    });

    bridge.emit({ type: "session.completed", payload: {} });
    expect(queue.pendingCount).toBe(1);

    release?.();
    await queue.flush();
  });

  it("설치된 bridge가 기존 logEvent 호출을 자동 복제하고 cleanup 후 중단", async () => {
    const browserStorage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: browserStorage });
    vi.stubGlobal("navigator", { sendBeacon: vi.fn() });
    const sender = {
      send: vi.fn().mockImplementation(async (events: readonly LearningEvent[]) => ({
        acceptedEventIds: events.map((event) => event.eventId),
      })),
    };
    const queue = new LearningEventQueue(
      createLearningEventQueueStore(createMemoryStorage()),
      sender,
    );
    const bridge = createLibraryLearningEventBridge(createLaunch(), queue, {
      createEventId: () => "event_observed_01",
    });
    const stop = installLibraryLearningEventBridge(bridge);

    await logEvent({
      gameId: "math-quick-quiz",
      cardId: "card-01",
      action: "submit",
      payload: { correct: true },
    });
    await vi.waitFor(() => expect(sender.send).toHaveBeenCalledOnce());
    expect(sender.send.mock.calls[0]![0][0]).toMatchObject({
      eventId: "event_observed_01",
      type: "submit",
      itemId: "card-01",
    });

    stop();
    await logEvent({
      gameId: "math-quick-quiz",
      cardId: "card-02",
      action: "submit",
    });
    expect(sender.send).toHaveBeenCalledTimes(1);
  });
});
