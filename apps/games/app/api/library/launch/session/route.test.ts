import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/library/session", () => ({
  readLibraryLaunchToken: vi.fn(),
  buildClearLibraryLaunchCookie: vi.fn(
    () => "pullim_games_library_launch=; Max-Age=0",
  ),
}));
vi.mock("@/lib/server/library/runtime-store", () => ({
  resolveLibraryLaunchSession: vi.fn(),
}));

import { GET } from "./route";
import { resolveLibraryLaunchSession } from "@/lib/server/library/runtime-store";
import { readLibraryLaunchToken } from "@/lib/server/library/session";

const ORIGIN = "http://localhost:3033";
const payload = {
  launchId: "launch_01",
  iat: 1_784_560_000,
  anonymousUserId: "anon_01",
  sessionId: "session_01",
  exp: 1_784_560_300,
  activity: {
    binding: { kind: "game-binding", id: "b", version: "1.0.0" },
    template: {
      kind: "game-template",
      id: "math-quick-quiz",
      version: "1.0.0",
    },
    curriculum: {
      kind: "curriculum-dataset",
      id: "d",
      version: "1.0.0",
    },
    gameId: "math-quick-quiz",
    mode: "default",
  },
};

function request(gameId = "math-quick-quiz", mode = "default") {
  const query = new URLSearchParams({ gameId, mode });
  return new Request(`${ORIGIN}/api/library/launch/session?${query}`, {
    headers: { cookie: "pullim_games_library_launch=opaque" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readLibraryLaunchToken).mockReturnValue("opaque");
  vi.mocked(resolveLibraryLaunchSession).mockResolvedValue({
    source: "database",
    session: payload,
  } as never);
});

describe("GET /api/library/launch/session", () => {
  it("opaque session의 최소 client context만 반환", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      launchId: "launch_01",
      anonymousUserId: "anon_01",
      sessionId: "session_01",
      activity: payload.activity,
      expiresAt: payload.exp * 1_000,
    });
  });

  it("route game/mode mismatch를 403으로 거부", async () => {
    expect((await GET(request("factorization"))).status).toBe(403);
    expect((await GET(request("math-quick-quiz", "deep-recall"))).status).toBe(
      403,
    );
  });

  it("만료 session은 cookie를 지우고 401", async () => {
    vi.mocked(resolveLibraryLaunchSession).mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
