import "server-only";

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

export type ResolvedLibraryLaunchSession = {
  readonly source: "database" | "demo-memory";
  readonly session: LibraryLaunchSession;
};

export async function resolveLibraryLaunchSession(
  token: string | null | undefined,
): Promise<ResolvedLibraryLaunchSession | null> {
  if (isLibraryDemoLaunchToken(token)) {
    const session = getDemoLibraryLaunchSession(token);
    return session ? { source: "demo-memory", session } : null;
  }
  const session = await getLibraryLaunchSession(token);
  return session ? { source: "database", session } : null;
}

export async function persistLibraryLearningEvents(
  launch: ResolvedLibraryLaunchSession,
  events: readonly LearningEvent[],
): Promise<readonly string[]> {
  if (launch.source === "demo-memory") {
    return storeDemoLibraryLearningEvents(launch.session.launchId, events);
  }
  return storeLibraryLearningEvents(launch.session.launchId, events);
}
