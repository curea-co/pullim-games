import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { LearningEvent, PinnedGameActivity } from "@/lib/library";
import { canonicalizeArtifact } from "@/lib/server/library/integrity";
import { LearningEventIdConflictError } from "@/lib/server/library/events";
import type { LibraryLaunchSession } from "@/lib/server/library/session";

const DEMO_TOKEN_PREFIX = "demo_";
const DEMO_SESSION_LIFETIME_MS = 30 * 60 * 1_000;
const DEMO_VERSION = "demo-2026.07.22";

const DEMO_ACTIVITY: PinnedGameActivity = {
  binding: {
    kind: "game-binding",
    id: "library-demo-math-quick-quiz",
    version: DEMO_VERSION,
  },
  template: {
    kind: "game-template",
    id: "math-quick-quiz",
    version: DEMO_VERSION,
  },
  curriculum: {
    kind: "curriculum-dataset",
    id: "math-quick-quiz-demo-cards",
    version: DEMO_VERSION,
  },
  gameId: "math-quick-quiz",
  mode: "default",
};

type StoredDemoEvent = {
  readonly hash: string;
  readonly launchId: string;
  readonly event: LearningEvent;
};

type DemoMemoryStore = {
  readonly sessions: Map<string, LibraryLaunchSession>;
  readonly events: Map<string, StoredDemoEvent>;
};

type DemoGlobal = typeof globalThis & {
  __pullimLibraryDemoMemory?: DemoMemoryStore;
};

function isDemoRuntime(): boolean {
  return process.env.NODE_ENV !== "production";
}

function getStore(): DemoMemoryStore {
  if (!isDemoRuntime()) throw new Error("library_demo_disabled");
  const root = globalThis as DemoGlobal;
  root.__pullimLibraryDemoMemory ??= {
    sessions: new Map(),
    events: new Map(),
  };
  return root.__pullimLibraryDemoMemory;
}

function hashEvent(event: LearningEvent): string {
  return createHash("sha256")
    .update(canonicalizeArtifact(event))
    .digest("hex");
}

function deleteLaunch(store: DemoMemoryStore, launchId: string): void {
  for (const [eventId, stored] of store.events) {
    if (stored.launchId === launchId) store.events.delete(eventId);
  }
}

function purgeExpiredSessions(store: DemoMemoryStore, now: number): void {
  for (const [token, session] of store.sessions) {
    if (session.exp * 1_000 > now) continue;
    store.sessions.delete(token);
    deleteLaunch(store, session.launchId);
  }
}

export function isLibraryDemoEnabled(): boolean {
  return isDemoRuntime();
}

export function isLibraryDemoLaunchToken(
  token: string | null | undefined,
): boolean {
  return Boolean(token?.startsWith(DEMO_TOKEN_PREFIX));
}

export function createDemoLibraryLaunchSession(
  now = Date.now(),
): {
  readonly token: string;
  readonly expiresAt: number;
  readonly session: LibraryLaunchSession;
} {
  const store = getStore();
  purgeExpiredSessions(store, now);
  const token = `${DEMO_TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
  const expiresAt = now + DEMO_SESSION_LIFETIME_MS;
  const session: LibraryLaunchSession = {
    launchId: `demo-launch-${randomUUID()}`,
    iat: Math.floor(now / 1_000),
    exp: Math.floor(expiresAt / 1_000),
    anonymousUserId: `anon-demo-${randomBytes(8).toString("hex")}`,
    sessionId: `demo-session-${randomUUID()}`,
    activity: DEMO_ACTIVITY,
  };
  store.sessions.set(token, session);
  return { token, expiresAt: session.exp * 1_000, session };
}

export function getDemoLibraryLaunchSession(
  token: string | null | undefined,
  now = Date.now(),
): LibraryLaunchSession | null {
  if (!isDemoRuntime() || !isLibraryDemoLaunchToken(token)) return null;
  const store = getStore();
  const demoToken = token as string;
  const session = store.sessions.get(demoToken);
  if (!session) return null;
  if (session.exp * 1_000 <= now) {
    store.sessions.delete(demoToken);
    deleteLaunch(store, session.launchId);
    return null;
  }
  return session;
}

export function storeDemoLibraryLearningEvents(
  launchId: string,
  events: readonly LearningEvent[],
  now = Date.now(),
): readonly string[] {
  const store = getStore();
  purgeExpiredSessions(store, now);
  const activeLaunch = [...store.sessions.values()].some(
    (session) =>
      session.launchId === launchId && session.exp * 1_000 > now,
  );
  if (!activeLaunch) throw new Error("library_demo_launch_missing");

  const pending = events.map((event) => ({ event, hash: hashEvent(event) }));
  for (const entry of pending) {
    const existing = store.events.get(entry.event.eventId);
    if (existing && existing.hash !== entry.hash) {
      throw new LearningEventIdConflictError(entry.event.eventId);
    }
  }
  for (const entry of pending) {
    store.events.set(entry.event.eventId, {
      hash: entry.hash,
      launchId,
      event: entry.event,
    });
  }
  return events.map((event) => event.eventId);
}

/** 테스트에서만 전역 개발 저장소를 초기화한다. */
export function resetDemoLibraryMemory(): void {
  const root = globalThis as DemoGlobal;
  root.__pullimLibraryDemoMemory = undefined;
}
