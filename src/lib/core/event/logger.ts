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

const EVENT_ENDPOINT = "/api/event";

/**
 * 이벤트 로깅. fire-and-forget.
 *
 * @returns Promise 가 resolve 되어도 서버 처리 결과를 보장 안 함.
 *          호출자는 await 할 필요 없음.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  const fingerprint = getFingerprint();
  if (!fingerprint) return; // SSR or storage rejected — no logging

  const body = JSON.stringify({
    fingerprint,
    gameId: input.gameId,
    cardId: input.cardId,
    action: input.action,
    timestampMs: Date.now(),
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
