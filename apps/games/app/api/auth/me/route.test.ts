// GET /api/auth/me 라우트 테스트 — 세션 조회 + 비캐시 헤더.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  readSessionTokenFromCookie: vi.fn(),
  getUserFromSessionToken: vi.fn(),
}));
vi.mock("@/lib/server/auth/users", () => ({
  toPublicUser: (u: { id: string; email: string; grade: string | null }) => ({
    id: u.id,
    email: u.email,
    grade: u.grade ?? null,
  }),
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

  it("유효 세션이면 공개 사용자 반환 (grade 포함)", async () => {
    vi.mocked(readSessionTokenFromCookie).mockReturnValue("tok");
    vi.mocked(getUserFromSessionToken).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      grade: "중2",
    } as never);
    const res = await GET(req("pullim_games_session=tok"));
    expect(await res.json()).toEqual({ user: { id: "u1", email: "a@b.com", grade: "중2" } });
  });

  it("토큰 있는데 DB 장애 → 503 + unavailable (미확정, 게이트 fail-open 근거)", async () => {
    vi.mocked(readSessionTokenFromCookie).mockReturnValue("tok");
    vi.mocked(getUserFromSessionToken).mockRejectedValue(new Error("DB down"));
    const res = await GET(req("pullim_games_session=tok"));
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ user: null, unavailable: true });
  });

  it("토큰 없으면 DB 미접근 → 200 (백엔드 장애여도 503 안 남, 익명 구분)", async () => {
    vi.mocked(readSessionTokenFromCookie).mockReturnValue(null);
    vi.mocked(getUserFromSessionToken).mockRejectedValue(new Error("DB down"));
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null });
    expect(getUserFromSessionToken).not.toHaveBeenCalled();
  });
});
