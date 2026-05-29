// POST /api/auth/logout 라우트 테스트 — same-origin 가드 + 세션 파기.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  readSessionTokenFromCookie: vi.fn(() => "tok"),
  destroySession: vi.fn(async () => {}),
  buildClearSessionCookie: () => "pullim_games_session=; Path=/; Max-Age=0",
}));

import { POST } from "./route";
import { destroySession } from "@/lib/server/auth/session";

const ORIGIN = "http://localhost:3033";

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/logout", () => {
  it("same-origin + 세션 → 200 + 세션 파기 + 쿠키 제거", async () => {
    const req = new Request(`${ORIGIN}/api/auth/logout`, {
      method: "POST",
      headers: { origin: ORIGIN, cookie: "pullim_games_session=tok" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(destroySession).toHaveBeenCalledWith("tok");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("Origin 없음 → 403", async () => {
    const req = new Request(`${ORIGIN}/api/auth/logout`, { method: "POST", headers: {} });
    expect((await POST(req)).status).toBe(403);
  });
});
