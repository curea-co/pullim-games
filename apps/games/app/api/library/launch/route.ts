import { NextResponse } from "next/server";

import { LibraryRuntimeError } from "@/lib/library/runtime";
import { isAllowedLibraryHandoffOrigin } from "@/lib/server/library/config";
import {
  libraryLaunchLocation,
  parseLibraryHandoffRequest,
  validateLibraryHandoff,
} from "@/lib/server/library/handoff";
import {
  buildLibraryLaunchCookie,
  createLibraryLaunchSession,
} from "@/lib/server/library/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" } as const;

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

export async function POST(request: Request) {
  if (!isAllowedLibraryHandoffOrigin(request)) {
    return NextResponse.json(
      { error: "forbidden_origin" },
      { status: 403, headers: NO_STORE },
    );
  }

  try {
    const handoff = await parseLibraryHandoffRequest(request);
    const launch = await validateLibraryHandoff(handoff);
    const session = await createLibraryLaunchSession(launch.payload);
    const location = libraryLaunchLocation(launch.payload);
    const headers = {
      ...NO_STORE,
      "set-cookie": buildLibraryLaunchCookie(
        session.token,
        session.expiresAt,
      ),
    };

    if (wantsJson(request)) {
      return NextResponse.json(
        { ok: true, location },
        { status: 201, headers },
      );
    }
    return new NextResponse(null, {
      status: 303,
      headers: { ...headers, location },
    });
  } catch (error) {
    if (error instanceof LibraryRuntimeError) {
      const unauthorized = error.code.startsWith("token_");
      return NextResponse.json(
        { error: unauthorized ? "invalid_launch_token" : "invalid_handoff" },
        { status: unauthorized ? 401 : 422, headers: NO_STORE },
      );
    }
    console.error("[library/launch] backend unavailable", {
      reason: (error as Error).message,
    });
    return NextResponse.json(
      { error: "backend_unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}
