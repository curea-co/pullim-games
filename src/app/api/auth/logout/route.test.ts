// POST /api/auth/logout 라우트 테스트 — same-origin + CSRF + 세션 파기.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  readSessionTokenFromCookie: vi.fn(() => "tok"),
  destroySession: vi.fn(async () => {}),
  buildClearSessionCookie: () => "pullim_games_session=; Path=/; Max-Age=0",
}));

import { POST } from "./route";
import { destroySession } from "@/lib/server/auth/session";
import { authCsrf } from "@/lib/server/auth/csrf";

const ORIGIN = "http://localhost:3033";

function makeReq(opts: { origin?: boolean; csrf?: boolean } = {}): Request {
  const { token } = authCsrf.issue();
  const headers: Record<string, string> = {};
  if (opts.origin !== false) headers.origin = ORIGIN;
  const cookies = ["pullim_games_session=tok"];
  if (opts.csrf !== false) {
    cookies.push(`pullim-csrf-auth=${token}`);
    headers["x-csrf-token"] = token;
  }
  headers.cookie = cookies.join("; ");
  return new Request(`${ORIGIN}/api/auth/logout`, { method: "POST", headers });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/logout", () => {
  it("same-origin + CSRF + 세션 → 200 + 세션 파기 + 쿠키 제거", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(destroySession).toHaveBeenCalledWith("tok");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("Origin 없음 → 403", async () => {
    expect((await POST(makeReq({ origin: false }))).status).toBe(403);
  });
  it("CSRF 없음 → 403", async () => {
    expect((await POST(makeReq({ csrf: false }))).status).toBe(403);
  });
});
