// GET /api/auth/me 라우트 테스트 — 세션 조회 + 비캐시 헤더.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  readSessionTokenFromCookie: vi.fn(),
  getUserFromSessionToken: vi.fn(),
}));
vi.mock("@/lib/server/auth/users", () => ({
  toPublicUser: (u: { id: string; email: string }) => ({ id: u.id, email: u.email }),
}));

import { GET } from "./route";
import {
  getUserFromSessionToken,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";

function req(cookie?: string): Request {
  return new Request("http://localhost:3033/api/auth/me", {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/auth/me", () => {
  it("세션 없으면 user:null + private,no-store 헤더", async () => {
    vi.mocked(readSessionTokenFromCookie).mockReturnValue(null);
    vi.mocked(getUserFromSessionToken).mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ user: null });
  });

  it("유효 세션이면 공개 사용자 반환", async () => {
    vi.mocked(readSessionTokenFromCookie).mockReturnValue("tok");
    vi.mocked(getUserFromSessionToken).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
    } as never);
    const res = await GET(req("pullim_games_session=tok"));
    expect(await res.json()).toEqual({ user: { id: "u1", email: "a@b.com" } });
  });

  it("DB 장애여도 fail-soft → 200 + user:null (익명 브라우징 유지)", async () => {
    vi.mocked(readSessionTokenFromCookie).mockReturnValue("tok");
    vi.mocked(getUserFromSessionToken).mockRejectedValue(new Error("DB down"));
    const res = await GET(req("pullim_games_session=tok"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null });
  });
});
