import { NextResponse } from "next/server";

import { libraryEventsCsrf } from "@/lib/server/library/csrf";

export const dynamic = "force-dynamic";

export function GET() {
  const { cookieHeader } = libraryEventsCsrf.issue();
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "set-cookie": cookieHeader,
      },
    },
  );
}
