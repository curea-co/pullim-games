import type {
  EventAction,
  LogEventInput,
  LogEventObservation,
} from "@/lib/core";
import { observeLogEvents } from "@/lib/core";

import {
  JsonObjectSchema,
  LearningEventSchema,
  LearningEventTypeSchema,
} from "../schemas";
import type {
  JsonObject,
  LearningEvent,
  LaunchTokenPayload,
  SemanticLearningEventType,
} from "../types";
import type {
  LearningEventFlushResult,
  LearningEventQueue,
} from "./event-queue";
import { LibraryRuntimeError } from "./errors";

export interface LearningEventLaunchContext {
  readonly payload: Pick<
    LaunchTokenPayload,
    "activity" | "anonymousUserId" | "sessionId"
  >;
}

export type LibraryLearningEventType =
  | EventAction
  | SemanticLearningEventType;

export interface LearningEventDraft {
  readonly type: LibraryLearningEventType;
  readonly itemId?: string;
  readonly standardId?: string;
  readonly durationMs?: number;
  readonly payload?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly timestampMs?: number;
}

export interface LearningEventFactoryDependencies {
  readonly createEventId?: () => string;
  readonly now?: () => number;
}

function defaultEventId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `event_${globalThis.crypto.randomUUID()}`;
  }
  throw new LibraryRuntimeError(
    "event_queue_invalid",
    "eventId 생성을 위한 crypto.randomUUID를 사용할 수 없습니다.",
  );
}

function parseJsonObject(
  input: Record<string, unknown> | undefined,
  label: string,
): JsonObject {
  const parsed = JsonObjectSchema.safeParse(input ?? {});
  if (!parsed.success) {
    throw new LibraryRuntimeError(
      "event_queue_invalid",
      `${label}는 JSON 직렬화 가능한 객체여야 합니다.`,
    );
  }
  return parsed.data;
}

/** launch snapshot을 복사해 새 LearningEvent를 한 번 생성한다. */
export function createLearningEvent(
  launch: LearningEventLaunchContext,
  draft: LearningEventDraft,
  dependencies: LearningEventFactoryDependencies = {},
): LearningEvent {
  const type = LearningEventTypeSchema.parse(draft.type);
  return LearningEventSchema.parse({
    schemaVersion: "1.0",
    eventId: (dependencies.createEventId ?? defaultEventId)(),
    type,
    ts: draft.timestampMs ?? dependencies.now?.() ?? Date.now(),
    anonymousUserId: launch.payload.anonymousUserId,
    sessionId: launch.payload.sessionId,
    activity: launch.payload.activity,
    standardId: draft.standardId,
    itemId: draft.itemId,
    durationMs: draft.durationMs,
    payload: parseJsonObject(draft.payload, "LearningEvent payload"),
    metadata:
      draft.metadata === undefined
        ? undefined
        : parseJsonObject(draft.metadata, "LearningEvent metadata"),
  });
}

/** 기존 LogEventInput을 같은 action 이름의 LearningEvent로 변환한다. */
export function learningEventFromLogObservation(
  launch: LearningEventLaunchContext,
  observation: LogEventObservation,
  dependencies: LearningEventFactoryDependencies = {},
): LearningEvent {
  if (observation.input.gameId !== launch.payload.activity.gameId) {
    throw new LibraryRuntimeError(
      "event_activity_mismatch",
      "기존 이벤트 gameId가 Library launch activity와 일치하지 않습니다.",
    );
  }
  return createLearningEvent(
    launch,
    {
      type: observation.input.action,
      itemId: observation.input.cardId ?? undefined,
      payload: observation.input.payload,
      timestampMs: observation.timestampMs,
    },
    dependencies,
  );
}

export interface LibraryLearningEventBridge {
  emit(draft: LearningEventDraft): LearningEvent;
  flush(): Promise<LearningEventFlushResult>;
  observe(observation: LogEventObservation): Promise<void>;
}

/** semantic event와 기존 logger 관찰 이벤트를 같은 queue에 넣는다. */
export function createLibraryLearningEventBridge(
  launch: LearningEventLaunchContext,
  queue: LearningEventQueue,
  dependencies: LearningEventFactoryDependencies = {},
): LibraryLearningEventBridge {
  const enqueueAndFlush = (event: LearningEvent): LearningEvent => {
    const queued = queue.enqueue(event);
    void queue.flush().catch(() => undefined);
    return queued;
  };

  return {
    emit(draft) {
      return enqueueAndFlush(createLearningEvent(launch, draft, dependencies));
    },
    flush() {
      return queue.flush();
    },
    async observe(observation) {
      const event = learningEventFromLogObservation(
        launch,
        observation,
        dependencies,
      );
      queue.enqueue(event);
      await queue.flush();
    },
  };
}

/**
 * 검증된 Library launch 동안 기존 logEvent 호출을 LearningEvent queue로 복제한다.
 * cleanup 호출 후에는 직접 실행 logger만 남는다.
 */
export function installLibraryLearningEventBridge(
  bridge: LibraryLearningEventBridge,
  options: {
    readonly onlineTarget?: Pick<
      Window,
      "addEventListener" | "removeEventListener"
    >;
  } = {},
): () => void {
  const onlineTarget =
    options.onlineTarget ??
    (typeof window !== "undefined" &&
    typeof window.addEventListener === "function" &&
    typeof window.removeEventListener === "function"
      ? window
      : undefined);
  const stopObserving = observeLogEvents((observation) =>
    bridge.observe(observation),
  );
  const retry = () => {
    void bridge.flush().catch(() => undefined);
  };
  onlineTarget?.addEventListener("online", retry);
  retry();

  return () => {
    stopObserving();
    onlineTarget?.removeEventListener("online", retry);
  };
}

/** 수동 어댑터 소비자가 core LogEventInput 타입을 재사용할 수 있게 노출한다. */
export type LegacyLogEventInput = LogEventInput;
