import { z } from "zod";

import { LearningEventSchema } from "../schemas";
import type { LearningEvent } from "../types";
import { LibraryRuntimeError } from "./errors";

export const DEFAULT_LIBRARY_EVENT_QUEUE_KEY =
  "pullim-games:library-learning-events:v1";

const PersistedQueueSchema = z
  .object({
    version: z.literal(1),
    events: z.array(LearningEventSchema),
  })
  .strict();

export interface LearningEventQueueStore {
  load(): unknown;
  save(events: readonly LearningEvent[]): void;
}

export interface LearningEventBatchReceipt {
  /** 수신자가 저장 또는 중복 처리 완료한 eventId. */
  readonly acceptedEventIds: readonly string[];
}

export interface LearningEventBatchSender {
  send(
    events: readonly LearningEvent[],
  ): Promise<LearningEventBatchReceipt>;
}

export interface LearningEventFlushResult {
  readonly attempted: number;
  readonly accepted: number;
  readonly pending: number;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage와 테스트 메모리 저장소에 공통으로 쓰는 JSON queue store. */
export function createLearningEventQueueStore(
  storage: KeyValueStorage,
  key = DEFAULT_LIBRARY_EVENT_QUEUE_KEY,
): LearningEventQueueStore {
  return {
    load() {
      const raw = storage.getItem(key);
      if (!raw) return [];
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        throw new LibraryRuntimeError(
          "event_queue_invalid",
          "LearningEvent queue JSON이 손상되었습니다.",
        );
      }
    },
    save(events) {
      storage.setItem(key, JSON.stringify({ version: 1, events }));
    },
  };
}

function parseStoredEvents(input: unknown): LearningEvent[] {
  if (Array.isArray(input) && input.length === 0) return [];
  const parsed = PersistedQueueSchema.safeParse(input);
  if (!parsed.success) {
    throw new LibraryRuntimeError(
      "event_queue_invalid",
      "LearningEvent queue 계약이 유효하지 않습니다.",
    );
  }
  return [...parsed.data.events];
}

/**
 * enqueue 시 먼저 영속하고, 수신 확인된 eventId만 제거한다.
 * 실패·부분 성공 뒤의 재시도는 저장된 원본 eventId를 그대로 사용한다.
 */
export class LearningEventQueue {
  private readonly events: LearningEvent[];
  private readonly batchSize: number;
  private readonly maxPending: number;
  private inFlight: Promise<LearningEventFlushResult> | null = null;
  private revision = 0;
  private inFlightRevision = -1;

  constructor(
    private readonly store: LearningEventQueueStore,
    private readonly sender: LearningEventBatchSender,
    options: {
      readonly batchSize?: number;
      readonly maxPending?: number;
    } = {},
  ) {
    this.batchSize = options.batchSize ?? 100;
    this.maxPending = options.maxPending ?? 2_000;
    if (!Number.isInteger(this.batchSize) || this.batchSize <= 0) {
      throw new LibraryRuntimeError(
        "event_queue_invalid",
        "LearningEvent batchSize는 양의 정수여야 합니다.",
      );
    }
    if (!Number.isInteger(this.maxPending) || this.maxPending <= 0) {
      throw new LibraryRuntimeError(
        "event_queue_invalid",
        "LearningEvent maxPending은 양의 정수여야 합니다.",
      );
    }
    this.events = parseStoredEvents(store.load());
    if (this.events.length > this.maxPending) {
      throw new LibraryRuntimeError(
        "event_queue_invalid",
        "저장된 LearningEvent queue가 상한을 초과했습니다.",
      );
    }
  }

  get pendingCount(): number {
    return this.events.length;
  }

  snapshot(): readonly LearningEvent[] {
    return [...this.events];
  }

  enqueue(input: LearningEvent): LearningEvent {
    const parsed = LearningEventSchema.safeParse(input);
    if (!parsed.success) {
      throw new LibraryRuntimeError(
        "event_queue_invalid",
        "enqueue할 LearningEvent가 유효하지 않습니다.",
      );
    }

    const duplicate = this.events.find(
      (event) => event.eventId === parsed.data.eventId,
    );
    if (duplicate) {
      if (JSON.stringify(duplicate) !== JSON.stringify(parsed.data)) {
        throw new LibraryRuntimeError(
          "event_queue_invalid",
          "같은 eventId에 서로 다른 LearningEvent를 저장할 수 없습니다.",
        );
      }
      return duplicate;
    }

    if (this.events.length >= this.maxPending) {
      throw new LibraryRuntimeError(
        "event_queue_invalid",
        "LearningEvent queue 상한을 초과했습니다.",
      );
    }

    this.events.push(parsed.data);
    this.revision += 1;
    this.store.save(this.events);
    return parsed.data;
  }

  flush(): Promise<LearningEventFlushResult> {
    if (this.inFlight) {
      const activeFlush = this.inFlight;
      const requestedRevision = this.revision;
      return activeFlush.then((result) =>
        requestedRevision > this.inFlightRevision ? this.flush() : result,
      );
    }
    this.inFlightRevision = this.revision;
    this.inFlight = this.performFlush().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async performFlush(): Promise<LearningEventFlushResult> {
    const batch = this.events.slice(0, this.batchSize);
    if (batch.length === 0) {
      return { attempted: 0, accepted: 0, pending: 0 };
    }

    const receipt = await this.sender.send(batch);
    const sentIds = new Set(batch.map((event) => event.eventId));
    const acceptedIds = new Set(
      receipt.acceptedEventIds.filter((eventId) => sentIds.has(eventId)),
    );

    if (acceptedIds.size > 0) {
      const remaining = this.events.filter(
        (event) => !acceptedIds.has(event.eventId),
      );
      this.events.splice(0, this.events.length, ...remaining);
      this.store.save(this.events);
    }

    return {
      attempted: batch.length,
      accepted: acceptedIds.size,
      pending: this.events.length,
    };
  }
}
