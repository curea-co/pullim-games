// /api/pullim/session-init 라우트 테스트 — featureGate·CSRF·same-origin·401vs503·재연결 트리거.
// 근거: proc/plan/2026-07-08_pb-member-relink-consume.md §E, Codex #149(전용 로그인 트리거).
import { beforeEach, describe, expect, it, vi } from "vitest";

let pullimMode = true;
let memberDataEnabled = true;

vi.mock("@/lib/auth/pullim-mode", () => ({
  get PULLIM_MODE() {
    return pullimMode;
  },
  PULLIM_DOMAIN_API_URL: "https://dev-api.pullim.ai",
  PULLIM_LOGIN_ORIGIN: "https://dev.pullim.ai",
}));
vi.mock("@/lib/server/auth/pullim-introspect", () => ({ resolvePullimSub: vi.fn() }));
vi.mock("@/lib/server/auth/pullim-member", () => ({
  get MEMBER_DATA_STORAGE_ENABLED() {
    return memberDataEnabled;
  },
  materializePullimMember: vi.fn(),
}));
vi.mock("@/lib/server/http/same-origin", () => ({ isSameOriginRequest: vi.fn(() => true) }));

import { POST } from "./route";
import { resolvePullimSub } from "@/lib/server/auth/pullim-introspect";
import { materializePullimMember } from "@/lib/server/auth/pullim-member";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { authCsrf } from "@/lib/server/auth/csrf";

const ORIGIN = "http://localhost:3004";

function postReq(opts: { origin?: boolean; csrf?: boolean } = {}): Request {
  const { token } = authCsrf.issue();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.origin !== false) headers.origin = ORIGIN;
  if (opts.csrf !== false) {
    headers.cookie = `pullim-csrf-auth=${token}; __Secure-dev-pullim-at=x`;
    headers["x-csrf-token"] = token;
  } else {
    headers.cookie = "__Secure-dev-pullim-at=x";
  }
  return new Request(`${ORIGIN}/api/pullim/session-init`, { method: "POST", headers });
}

beforeEach(() => {
  pullimMode = true;
  memberDataEnabled = true;
  vi.mocked(resolvePullimSub).mockReset();
  vi.mocked(materializePullimMember).mockReset();
  vi.mocked(materializePullimMember).mockResolvedValue({ id: "u", sub: "s1", grade: null });
  vi.mocked(isSameOriginRequest).mockReturnValue(true);
});

describe("POST /api/pullim/session-init", () => {
  it("PULLIM_MODE off → 404", async () => {
    pullimMode = false;
    expect((await POST(postReq())).status).toBe(404);
  });
  it("🔴 MEMBER_DATA 비활성 → 503(재연결 안 함)", async () => {
    memberDataEnabled = false;
    expect((await POST(postReq())).status).toBe(503);
    expect(materializePullimMember).not.toHaveBeenCalled();
  });
  it("cross-origin → 403", async () => {
    vi.mocked(isSameOriginRequest).mockReturnValue(false);
    expect((await POST(postReq())).status).toBe(403);
    expect(materializePullimMember).not.toHaveBeenCalled();
  });
  it("CSRF 토큰 누락 → 403", async () => {
    expect((await POST(postReq({ csrf: false }))).status).toBe(403);
    expect(materializePullimMember).not.toHaveBeenCalled();
  });
  it("장애(unavailable) → 503, 미인증(sub null) → 401(재연결 안 함)", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: null, unavailable: true, emailMatchHash: null });
    expect((await POST(postReq())).status).toBe(503);
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: null, unavailable: false, emailMatchHash: null });
    expect((await POST(postReq())).status).toBe(401);
    expect(materializePullimMember).not.toHaveBeenCalled();
  });
  it("회원 → materializePullimMember(sub, emailMatchHash) 호출 + 재연결 반영 grade 반환", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: "s1", unavailable: false, emailMatchHash: "d1bbcc" });
    vi.mocked(materializePullimMember).mockResolvedValue({ id: "u", sub: "s1", grade: "중2" });
    const res = await POST(postReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, grade: "중2" });
    expect(materializePullimMember).toHaveBeenCalledWith("s1", "d1bbcc");
  });
  it("materialize throw → 503", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: "s1", unavailable: false, emailMatchHash: null });
    vi.mocked(materializePullimMember).mockRejectedValue(new Error("db down"));
    expect((await POST(postReq())).status).toBe(503);
  });
});
