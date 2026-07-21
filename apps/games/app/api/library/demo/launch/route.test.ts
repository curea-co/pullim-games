import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/http/same-origin", () => ({
  isSameOriginRequest: vi.fn(),
}));
vi.mock("@/lib/server/library/demo-memory", () => ({
  createDemoLibraryLaunchSession: vi.fn(),
  isLibraryDemoEnabled: vi.fn(),
}));
vi.mock("@/lib/server/library/handoff", () => ({
  libraryLaunchLocation: vi.fn(),
}));
vi.mock("@/lib/server/library/session", () => ({
  buildLibraryLaunchCookie: vi.fn(),
}));

import { POST } from "./route";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import {
  createDemoLibraryLaunchSession,
  isLibraryDemoEnabled,
} from "@/lib/server/library/demo-memory";
import { libraryLaunchLocation } from "@/lib/server/library/handoff";
import { buildLibraryLaunchCookie } from "@/lib/server/library/session";

const ORIGIN = "http://localhost:3033";
const demo = {
  token: "demo_opaque",
  expiresAt: 1_784_560_300_000,
  session: {
    activity: { gameId: "math-quick-quiz", mode: "default" },
  },
};

function request(accept = "text/html") {
  return new Request(`${ORIGIN}/api/library/demo/launch`, {
    method: "POST",
    headers: { origin: ORIGIN, accept },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isLibraryDemoEnabled).mockReturnValue(true);
  vi.mocked(isSameOriginRequest).mockReturnValue(true);
  vi.mocked(createDemoLibraryLaunchSession).mockReturnValue(demo as never);
  vi.mocked(libraryLaunchLocation).mockReturnValue(
    "/games/math-quick-quiz?library=1",
  );
  vi.mocked(buildLibraryLaunchCookie).mockReturnValue(
    "pullim_games_library_launch=demo_opaque; HttpOnly",
  );
});

describe("POST /api/library/demo/launch", () => {
  it("개발 샘플 session cookie를 만들고 기존 게임으로 redirect", () => {
    const response = POST(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/games/math-quick-quiz?library=1",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("JSON 소비자에는 같은 location을 201로 반환", async () => {
    const response = POST(request("application/json"));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      location: "/games/math-quick-quiz?library=1",
    });
  });

  it("운영 비활성 상태는 origin 검사 전 404", async () => {
    vi.mocked(isLibraryDemoEnabled).mockReturnValue(false);
    const response = POST(request());
    expect(response.status).toBe(404);
    expect(isSameOriginRequest).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });

  it("cross-origin 요청은 session 발급 전 거부", () => {
    vi.mocked(isSameOriginRequest).mockReturnValue(false);
    const response = POST(request());
    expect(response.status).toBe(403);
    expect(createDemoLibraryLaunchSession).not.toHaveBeenCalled();
  });
});
