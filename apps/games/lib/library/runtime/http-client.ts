import type { LearningEvent } from "../types";
import type { LearningEventBatchSender } from "./event-queue";
import {
  LearningEventBatchReceiptSchema,
  LibraryClientSessionSchema,
  type LibraryClientSession,
} from "./http-contracts";

const SESSION_ENDPOINT = "/api/library/launch/session";
const EVENTS_ENDPOINT = "/api/library/events";
const CSRF_ENDPOINT = "/api/library/events/csrf";
const CSRF_COOKIE = "pullim-csrf-library-events";
const CSRF_HEADER = "x-csrf-token";

type Fetcher = typeof fetch;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

async function refreshCsrf(fetcher: Fetcher): Promise<string> {
  const response = await fetcher(CSRF_ENDPOINT, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("library_csrf_unavailable");
  const token = readCookie(CSRF_COOKIE);
  if (!token) throw new Error("library_csrf_cookie_missing");
  return token;
}

export async function fetchLibraryClientSession(
  gameId: string,
  mode: string,
  fetcher: Fetcher = fetch,
): Promise<LibraryClientSession> {
  const query = new URLSearchParams({ gameId, mode });
  const response = await fetcher(`${SESSION_ENDPOINT}?${query}`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`library_session_${response.status}`);
  const parsed = LibraryClientSessionSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("library_session_invalid");
  return parsed.data;
}

export function createLibraryEventBatchSender(
  fetcher: Fetcher = fetch,
): LearningEventBatchSender {
  async function sendOnce(
    events: readonly LearningEvent[],
    csrfToken: string,
  ) {
    return fetcher(EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [CSRF_HEADER]: csrfToken,
      },
      body: JSON.stringify({ events }),
      credentials: "same-origin",
      keepalive: true,
    });
  }

  return {
    async send(events) {
      let csrfToken = readCookie(CSRF_COOKIE) ?? (await refreshCsrf(fetcher));
      let response = await sendOnce(events, csrfToken);
      if (response.status === 403) {
        csrfToken = await refreshCsrf(fetcher);
        response = await sendOnce(events, csrfToken);
      }
      if (!response.ok) {
        throw new Error(`library_events_${response.status}`);
      }
      const receipt = LearningEventBatchReceiptSchema.safeParse(
        await response.json(),
      );
      if (!receipt.success) throw new Error("library_events_receipt_invalid");
      return receipt.data;
    },
  };
}
