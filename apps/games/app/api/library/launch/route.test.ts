import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/library/config", () => ({
  isAllowedLibraryHandoffOrigin: vi.fn(),
}));
vi.mock("@/lib/server/library/handoff", () => ({
  parseLibraryHandoffRequest: vi.fn(),
  validateLibraryHandoff: vi.fn(),
  libraryLaunchLocation: vi.fn(),
}));
vi.mock("@/lib/server/library/session", () => ({
  createLibraryLaunchSession: vi.fn(),
  buildLibraryLaunchCookie: vi.fn(),
}));

import { POST } from "./route";
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

const ORIGIN = "http://localhost:3033";
const handoff = { token: "t", artifacts: {} };
const launch = {
  payload: {
    activity: { gameId: "math-quick-quiz", mode: "default" },
  },
};

function request(accept = "application/json") {
  return new Request(`${ORIGIN}/api/library/launch`, {
    method: "POST",
    headers: {
      origin: "https://library.pullim.example",
      accept,
      "content-type": "application/json",
    },
    body: "{}",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isAllowedLibraryHandoffOrigin).mockReturnValue(true);
  vi.mocked(parseLibraryHandoffRequest).mockResolvedValue(handoff as never);
  vi.mocked(validateLibraryHandoff).mockResolvedValue(launch as never);
  vi.mocked(createLibraryLaunchSession).mockResolvedValue({
    token: "opaque",
    expiresAt: 1_784_560_300_000,
  });
  vi.mocked(libraryLaunchLocation).mockReturnValue(
    "/games/math-quick-quiz?library=1",
  );
  vi.mocked(buildLibraryLaunchCookie).mockReturnValue(
    "pullim_games_library_launch=opaque; HttpOnly",
  );
});

describe("POST /api/library/launch", () => {
  it("검증 성공 JSON client → opaque cookie + 201 location", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      location: "/games/math-quick-quiz?library=1",
    });
  });

  it("top-level form client → 303 redirect", async () => {
    const response = await POST(request("text/html"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/games/math-quick-quiz?library=1",
    );
  });

  it("허용되지 않은 origin을 handoff 검증 전에 거부", async () => {
    vi.mocked(isAllowedLibraryHandoffOrigin).mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(parseLibraryHandoffRequest).not.toHaveBeenCalled();
  });

  it("서명 오류는 401, artifact 오류는 422", async () => {
    vi.mocked(validateLibraryHandoff).mockRejectedValueOnce(
      new LibraryRuntimeError("token_expired", "expired"),
    );
    expect((await POST(request())).status).toBe(401);

    vi.mocked(validateLibraryHandoff).mockRejectedValueOnce(
      new LibraryRuntimeError("artifact_mismatch", "drift"),
    );
    expect((await POST(request())).status).toBe(422);
  });

  it("DB/설정 실패는 token 내용을 노출하지 않고 503", async () => {
    vi.mocked(createLibraryLaunchSession).mockRejectedValueOnce(
      new Error("db down"),
    );
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "backend_unavailable",
    });
  });
});
