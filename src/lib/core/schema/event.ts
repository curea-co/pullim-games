// 익명 이벤트 로깅 스키마 — /api/event 가 검증 후 적재.
// SPEC §05 §5.3 + SPEC §10.2 Phase 2 데이터 로깅.

import { z } from "zod";

/** 모든 게임이 공통으로 보낼 수 있는 인터랙션 액션. */
export const EventActionSchema = z.enum([
  "drag-start",
  "drag-end",
  "transform",
  "submit",
  "abandon",
  "session-start",
  "session-end",
]);

export type EventAction = z.infer<typeof EventActionSchema>;

/** 이벤트 페이로드 (자유 형식, 게임마다 다름). */
const EventPayloadSchema = z.record(z.unknown()).optional();

export const EventSchema = z.object({
  /** 익명 fingerprint (SPEC §05 §5.2 Auth/ACL). */
  fingerprint: z.string().min(1),

  /** 게임 모듈 id (registry의 GameMeta.id). */
  gameId: z.string().min(1),

  /** 이벤트가 속한 카드 id. session-start 등은 null 가능. */
  cardId: z.string().nullable(),

  /** 액션 종류. */
  action: EventActionSchema,

  /** 클라이언트 시각 ms. (서버 타임스탬프는 서버가 별도로 찍는다.) */
  timestampMs: z.number().int().nonnegative(),

  /** 게임별 자유 페이로드 (좌표, 시간차 등 인터랙션 측정용). */
  payload: EventPayloadSchema,
});

export type Event = z.infer<typeof EventSchema>;
