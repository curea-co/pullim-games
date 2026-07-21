import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import {
  createDemoLibraryLaunchSession,
  isLibraryDemoEnabled,
} from "@/lib/server/library/demo-memory";
import { libraryLaunchLocation } from "@/lib/server/library/handoff";
import { buildLibraryLaunchCookie } from "@/lib/server/library/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" } as const;

export function POST(request: Request) {
  if (!isLibraryDemoEnabled()) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE },
    );
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "forbidden_origin" },
      { status: 403, headers: NO_STORE },
    );
  }

  const demo = createDemoLibraryLaunchSession();
  const location = libraryLaunchLocation(demo.session);
  const headers = {
    ...NO_STORE,
    "set-cookie": buildLibraryLaunchCookie(demo.token, demo.expiresAt),
  };
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json(
      { ok: true, location },
      { status: 201, headers },
    );
  }
  return new NextResponse(null, {
    status: 303,
    headers: { ...headers, location },
  });
}
