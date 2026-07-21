import { NextResponse } from "next/server";

import type { LearningEvent, PinnedGameActivity } from "@/lib/library";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import {
  LIBRARY_EVENTS_CSRF_HEADER,
  libraryEventsCsrf,
} from "@/lib/server/library/csrf";
import { LearningEventIdConflictError } from "@/lib/server/library/events";
import { LibraryEventBatchSchema } from "@/lib/server/library/schemas";
import { readLibraryLaunchToken } from "@/lib/server/library/session";
import type { LibraryLaunchSession } from "@/lib/server/library/session";
import {
  persistLibraryLearningEvents,
  resolveLibraryLaunchSession,
} from "@/lib/server/library/runtime-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" } as const;
const MAX_BATCH_BYTES = 512 * 1024;
const EVENT_CLOCK_TOLERANCE_MS = 5_000;

function sameActivity(
  left: PinnedGameActivity,
  right: PinnedGameActivity,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function matchesLaunch(
  event: LearningEvent,
  launch: LibraryLaunchSession,
): boolean {
  return (
    event.anonymousUserId === launch.anonymousUserId &&
    event.sessionId === launch.sessionId &&
    sameActivity(event.activity, launch.activity) &&
    event.ts >= launch.iat * 1_000 - EVENT_CLOCK_TOLERANCE_MS &&
    event.ts <= launch.exp * 1_000 + EVENT_CLOCK_TOLERANCE_MS
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "forbidden_origin" },
      { status: 403, headers: NO_STORE },
    );
  }
  if (
    !libraryEventsCsrf.verify(
      libraryEventsCsrf.readCookieToken(request.headers.get("cookie")),
      request.headers.get(LIBRARY_EVENTS_CSRF_HEADER),
    )
  ) {
    return NextResponse.json(
      { error: "forbidden_csrf" },
      { status: 403, headers: NO_STORE },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BATCH_BYTES) {
    return NextResponse.json(
      { error: "payload_too_large" },
      { status: 413, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BATCH_BYTES) {
      return NextResponse.json(
        { error: "payload_too_large" },
        { status: 413, headers: NO_STORE },
      );
    }
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: NO_STORE },
    );
  }
  const parsed = LibraryEventBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 422, headers: NO_STORE },
    );
  }

  try {
    const token = readLibraryLaunchToken(request.headers.get("cookie"));
    const resolved = await resolveLibraryLaunchSession(token);
    if (!resolved) {
      return NextResponse.json(
        { error: "launch_session_expired" },
        { status: 401, headers: NO_STORE },
      );
    }
    const launch = resolved.session;
    if (parsed.data.events.some((event) => !matchesLaunch(event, launch))) {
      return NextResponse.json(
        { error: "event_launch_mismatch" },
        { status: 403, headers: NO_STORE },
      );
    }

    const acceptedEventIds = await persistLibraryLearningEvents(
      resolved,
      parsed.data.events,
    );
    return NextResponse.json(
      { acceptedEventIds },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof LearningEventIdConflictError) {
      return NextResponse.json(
        { error: "event_id_conflict", eventId: error.eventId },
        { status: 409, headers: NO_STORE },
      );
    }
    console.error("[library/events] backend unavailable", {
      reason: (error as Error).message,
    });
    return NextResponse.json(
      { error: "backend_unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}
