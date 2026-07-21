import { NextResponse } from "next/server";

import {
  buildClearLibraryLaunchCookie,
  readLibraryLaunchToken,
} from "@/lib/server/library/session";
import { LibrarySessionQuerySchema } from "@/lib/server/library/schemas";
import { resolveLibraryLaunchSession } from "@/lib/server/library/runtime-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" } as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = LibrarySessionQuerySchema.safeParse({
    gameId: url.searchParams.get("gameId"),
    mode: url.searchParams.get("mode") ?? "default",
  });
  if (!query.success) {
    return NextResponse.json(
      { error: "invalid_route_context" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const token = readLibraryLaunchToken(request.headers.get("cookie"));
    const resolved = await resolveLibraryLaunchSession(token);
    if (!resolved) {
      return NextResponse.json(
        { error: "launch_session_expired" },
        {
          status: 401,
          headers: {
            ...NO_STORE,
            "set-cookie": buildClearLibraryLaunchCookie(),
          },
        },
      );
    }
    const payload = resolved.session;
    if (
      payload.activity.gameId !== query.data.gameId ||
      payload.activity.mode !== query.data.mode
    ) {
      return NextResponse.json(
        { error: "launch_route_mismatch" },
        { status: 403, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      {
        launchId: payload.launchId,
        anonymousUserId: payload.anonymousUserId,
        sessionId: payload.sessionId,
        activity: payload.activity,
        expiresAt: payload.exp * 1_000,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[library/launch/session] backend unavailable", {
      reason: (error as Error).message,
    });
    return NextResponse.json(
      { error: "backend_unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}
