// POST /api/auth/login 라우트 테스트 — 가드 + 자격검증 (DB 계층 mock).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/users", () => ({
  findUserByEmail: vi.fn(),
  linkFingerprint: vi.fn(),
  touchLastSeen: vi.fn(),
  toPublicUser: (u: { id: string; email: string }) => ({ id: u.id, email: u.email }),
}));
vi.mock("@/lib/server/auth/session", () => ({
  createSession: vi.fn(),
  buildSessionCookie: () => "pullim_games_session=s; Path=/; HttpOnly",
}));
vi.mock("@/lib/server/auth/password", () => ({ verifyPasswordConstantTime: vi.fn() }));
vi.mock("@/lib/server/db/client", () => ({
  withTx: vi.fn(async (fn: (q: unknown) => Promise<unknown>) => fn(vi.fn())),
}));

import { POST } from "./route";
import { findUserByEmail } from "@/lib/server/auth/users";
import { createSession } from "@/lib/server/auth/session";
import { verifyPasswordConstantTime } from "@/lib/server/auth/password";
import { authCsrf } from "@/lib/server/auth/csrf";
import { resetRateLimitForTests } from "@/lib/server/rate-limit";

const ORIGIN = "http://localhost:3033";

function makeReq(body: unknown, opts: { origin?: boolean; csrf?: boolean } = {}): Request {
  const { token } = authCsrf.issue();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.origin !== false) headers.origin = ORIGIN;
  if (opts.csrf !== false) {
    headers.cookie = `pullim-csrf-auth=${token}`;
    headers["x-csrf-token"] = token;
  }
  return new Request(`${ORIGIN}/api/auth/login`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID = { email: "a@b.com", password: "abcd1234" };

beforeEach(() => {
  resetRateLimitForTests();
  vi.clearAllMocks();
  vi.mocked(findUserByEmail).mockResolvedValue({
    id: "u1",
    email: "a@b.com",
    password_hash: "h",
  } as never);
  vi.mocked(verifyPasswordConstantTime).mockResolvedValue(true);
  vi.mocked(createSession).mockResolvedValue({ token: "s", expiresAt: Date.now() + 1000 });
});

describe("POST /api/auth/login", () => {
  it("정상 로그인 → 200 + 세션 쿠키", async () => {
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("pullim_games_session");
  });
  it("틀린 비번 → 401", async () => {
    vi.mocked(verifyPasswordConstantTime).mockResolvedValue(false);
    expect((await POST(makeReq(VALID))).status).toBe(401);
  });
  it("미존재 계정 → 401 (상수시간 경로)", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(verifyPasswordConstantTime).mockResolvedValue(false);
    expect((await POST(makeReq(VALID))).status).toBe(401);
  });
  it("Origin 없음 → 403", async () => {
    expect((await POST(makeReq(VALID, { origin: false }))).status).toBe(403);
  });
  it("CSRF 없음 → 403", async () => {
    expect((await POST(makeReq(VALID, { csrf: false }))).status).toBe(403);
  });
});
