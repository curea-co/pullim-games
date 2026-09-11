// POST /api/auth/signup 라우트 테스트 — 가드 실패경로 + happy/409 경합 (DB 계층 mock).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/users", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  linkFingerprint: vi.fn(),
  toPublicUser: (u: { id: string; email: string; grade: string | null }) => ({
    id: u.id,
    email: u.email,
    grade: u.grade ?? null,
  }),
}));
vi.mock("@/lib/server/auth/session", () => ({
  createSession: vi.fn(),
  buildSessionCookie: () => "pullim_games_session=s; Path=/; HttpOnly",
}));
vi.mock("@/lib/server/auth/password", () => ({ hashPassword: vi.fn(async () => "hash") }));
vi.mock("@/lib/server/db/client", () => ({
  withTx: vi.fn(async (fn: (q: unknown) => Promise<unknown>) => fn(vi.fn())),
  isUniqueViolation: (e: unknown) => (e as { code?: string })?.code === "23505",
}));

import { POST } from "./route";
import { createUser, findUserByEmail } from "@/lib/server/auth/users";
import { createSession } from "@/lib/server/auth/session";
import { withTx } from "@/lib/server/db/client";
import { authCsrf } from "@/lib/server/auth/csrf";
import { resetRateLimitForTests } from "@/lib/server/rate-limit";

const ORIGIN = "http://localhost:3004";

function makeReq(body: unknown, opts: { origin?: boolean; csrf?: boolean } = {}): Request {
  const { token } = authCsrf.issue();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.origin !== false) headers.origin = ORIGIN;
  if (opts.csrf !== false) {
    headers.cookie = `pullim-csrf-auth=${token}`;
    headers["x-csrf-token"] = token;
  }
  return new Request(`${ORIGIN}/api/auth/signup`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID = { email: "a@b.com", password: "abcd1234", consent: true, grade: "중2" };

beforeEach(() => {
  resetRateLimitForTests();
  vi.clearAllMocks();
  vi.mocked(findUserByEmail).mockResolvedValue(null);
  vi.mocked(createUser).mockResolvedValue({ id: "u1", email: "a@b.com", grade: "중2" } as never);
  vi.mocked(createSession).mockResolvedValue({ token: "s", expiresAt: Date.now() + 1000 });
});

describe("POST /api/auth/signup", () => {
  it("정상 가입 → 201 + 세션 쿠키 + grade 가 DB·응답까지 전달", async () => {
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toContain("pullim_games_session");
    // grade 가 createUser(email, passwordHash, grade, tx) 3번째 인자로 전달되는지 잠금.
    expect(vi.mocked(createUser).mock.calls[0]?.[2]).toBe("중2");
    // 공개 응답(user)에 grade 노출 잠금.
    const body = (await res.json()) as { user: { grade: string | null } };
    expect(body.user.grade).toBe("중2");
  });
  it("Origin 없음 → 403", async () => {
    expect((await POST(makeReq(VALID, { origin: false }))).status).toBe(403);
  });
  it("CSRF 없음 → 403", async () => {
    expect((await POST(makeReq(VALID, { csrf: false }))).status).toBe(403);
  });
  it("약한 비번 → 422", async () => {
    expect((await POST(makeReq({ ...VALID, password: "x" }))).status).toBe(422);
  });
  it("초등(범위 밖)·학년 누락 → 422 (중·고 타겟 강제)", async () => {
    expect((await POST(makeReq({ ...VALID, grade: "초5" }))).status).toBe(422);
    const { grade: _omit, ...noGrade } = VALID;
    expect((await POST(makeReq(noGrade))).status).toBe(422);
  });
  it("이미 가입된 이메일 → 409", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({ id: "u1" } as never);
    expect((await POST(makeReq(VALID))).status).toBe(409);
  });
  it("경합(UNIQUE 위반) → 409", async () => {
    vi.mocked(withTx).mockRejectedValueOnce({ code: "23505" } as never);
    expect((await POST(makeReq(VALID))).status).toBe(409);
  });
});
