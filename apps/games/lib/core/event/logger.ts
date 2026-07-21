// 이벤트 로거 — 게임 모듈이 사용하는 단일 진입점.
// 내부에서 fingerprint 자동 부착 + /api/event POST.
// silent fail 정책: 네트워크 실패가 게임 진행을 막지 않음.

import { getFingerprint } from "@/lib/core/fingerprint";
import type { EventAction } from "@/lib/core/schema";

export interface LogEventInput {
  /** 게임 모듈 id (registry GameMeta.id). */
  gameId: string;
  /** 이벤트가 속한 카드 id. session-start 등은 null. */
  cardId: string | null;
  action: EventAction;
  /** 게임별 자유 페이로드. */
  payload?: Record<string, unknown>;
}

export interface LogEventObservation {
  readonly input: LogEventInput;
  readonly timestampMs: number;
}

export type LogEventObserver = (
  observation: LogEventObservation,
) => void | Promise<void>;

const EVENT_ENDPOINT = "/api/event";
const observers = new Set<LogEventObserver>();

/**
 * 기존 이벤트 전송 계약을 바꾸지 않고 추가 소비자가 이벤트를 관찰하게 한다.
 * observer 실패는 기존 게임 진행과 `/api/event` 전송을 막지 않는다.
 */
export function observeLogEvents(observer: LogEventObserver): () => void {
  observers.add(observer);
  return () => observers.delete(observer);
}

function notifyObservers(observation: LogEventObservation): void {
  for (const observer of observers) {
    try {
      void Promise.resolve(observer(observation)).catch(() => undefined);
    } catch {
      // observer 격리 — 분석 연동 실패가 게임 진행을 막지 않는다.
    }
  }
}

/**
 * 이벤트 로깅. fire-and-forget.
 *
 * @returns Promise 가 resolve 되어도 서버 처리 결과를 보장 안 함.
 *          호출자는 await 할 필요 없음.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  const timestampMs = Date.now();
  notifyObservers({ input, timestampMs });

  const fingerprint = getFingerprint();
  if (!fingerprint) return; // SSR or storage rejected — no logging

  const body = JSON.stringify({
    fingerprint,
    gameId: input.gameId,
    cardId: input.cardId,
    action: input.action,
    timestampMs,
    payload: input.payload,
  });

  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      // sendBeacon — 페이지 unload 시에도 안전, 큐에 누적
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(EVENT_ENDPOINT, blob);
      return;
    }
    await fetch(EVENT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // silent — 게임 진행 보호
  }
}
