// /api/pullim/grade 라우트 테스트 — featureGate(404/503)·401vs503·CSRF·same-origin·200 경로 잠금.
// 근거: spec/05 §5.2(장애/미인증 구분)·§2-D P-C(회원 저장 가드). Codex #146.
import { beforeEach, describe, expect, it, vi } from "vitest";

// 플래그는 getter 로 per-test 제어(라우트가 호출 시점에 읽음).
let pullimMode = true;
let memberDataEnabled = true;

vi.mock("@/lib/auth/pullim-mode", () => ({
  get PULLIM_MODE() {
    return pullimMode;
  },
  PULLIM_DOMAIN_API_URL: "https://dev-api.pullim.ai",
  PULLIM_LOGIN_ORIGIN: "https://dev.pullim.ai",
}));
vi.mock("@/lib/server/auth/pullim-introspect", () => ({
  resolvePullimSub: vi.fn(),
}));
vi.mock("@/lib/server/auth/pullim-member", () => ({
  get MEMBER_DATA_STORAGE_ENABLED() {
    return memberDataEnabled;
  },
  getPullimMemberGrade: vi.fn(),
  setPullimMemberGrade: vi.fn(),
}));
vi.mock("@/lib/server/http/same-origin", () => ({ isSameOriginRequest: vi.fn(() => true) }));

import { GET, POST } from "./route";
import { resolvePullimSub } from "@/lib/server/auth/pullim-introspect";
import { getPullimMemberGrade, setPullimMemberGrade } from "@/lib/server/auth/pullim-member";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { authCsrf } from "@/lib/server/auth/csrf";

const ORIGIN = "http://localhost:3004";

function postReq(body: unknown, opts: { origin?: boolean; csrf?: boolean } = {}): Request {
  const { token } = authCsrf.issue();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.origin !== false) headers.origin = ORIGIN;
  if (opts.csrf !== false) {
    headers.cookie = `pullim-csrf-auth=${token}; __Secure-dev-pullim-at=x`;
    headers["x-csrf-token"] = token;
  } else {
    headers.cookie = "__Secure-dev-pullim-at=x";
  }
  return new Request(`${ORIGIN}/api/pullim/grade`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const getReq = () =>
  new Request(`${ORIGIN}/api/pullim/grade`, { headers: { cookie: "__Secure-dev-pullim-at=x" } });

beforeEach(() => {
  pullimMode = true;
  memberDataEnabled = true;
  vi.mocked(resolvePullimSub).mockReset();
  vi.mocked(getPullimMemberGrade).mockReset();
  vi.mocked(setPullimMemberGrade).mockReset();
  vi.mocked(isSameOriginRequest).mockReturnValue(true);
});

describe("featureGate", () => {
  it("PULLIM_MODE off → GET·POST 404", async () => {
    pullimMode = false;
    expect((await GET(getReq())).status).toBe(404);
    expect((await POST(postReq({ grade: "중1" }))).status).toBe(404);
  });

  it("🔴 MEMBER_DATA 저장 비활성(P-C 미확정) → GET·POST 503 member_data_disabled", async () => {
    memberDataEnabled = false;
    const g = await GET(getReq());
    expect(g.status).toBe(503);
    expect((await g.json()).error).toBe("member_data_disabled");
    expect((await POST(postReq({ grade: "중1" }))).status).toBe(503);
    // 저장 안 함
    expect(setPullimMemberGrade).not.toHaveBeenCalled();
  });
});

describe("GET — 장애/미인증 구분", () => {
  it("장애(unavailable) → 503(미인증 401 아님, 로그인 회원 재분류 방지)", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: null, unavailable: true });
    expect((await GET(getReq())).status).toBe(503);
  });
  it("미인증(sub null) → 401", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: null, unavailable: false });
    expect((await GET(getReq())).status).toBe(401);
  });
  it("회원 → 200 + grade", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: "s1", unavailable: false });
    vi.mocked(getPullimMemberGrade).mockResolvedValue("중2");
    const r = await GET(getReq());
    expect(r.status).toBe(200);
    expect((await r.json()).grade).toBe("중2");
  });
});

describe("POST — CSRF·same-origin·검증·저장", () => {
  it("cross-origin → 403", async () => {
    vi.mocked(isSameOriginRequest).mockReturnValue(false);
    expect((await POST(postReq({ grade: "중1" }))).status).toBe(403);
  });
  it("CSRF 토큰 누락 → 403", async () => {
    expect((await POST(postReq({ grade: "중1" }, { csrf: false }))).status).toBe(403);
  });
  it("🔴 타겟 밖 grade(고3)·빈값 → 400", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: "s1", unavailable: false });
    expect((await POST(postReq({ grade: "고3" }))).status).toBe(400);
    expect((await POST(postReq({ grade: "" }))).status).toBe(400);
    expect(setPullimMemberGrade).not.toHaveBeenCalled();
  });
  it("장애 → 503, 미인증 → 401(저장 안 함)", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: null, unavailable: true });
    expect((await POST(postReq({ grade: "중1" }))).status).toBe(503);
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: null, unavailable: false });
    expect((await POST(postReq({ grade: "중1" }))).status).toBe(401);
    expect(setPullimMemberGrade).not.toHaveBeenCalled();
  });
  it("유효 회원 + 유효 grade → 200 + setPullimMemberGrade(sub, grade)", async () => {
    vi.mocked(resolvePullimSub).mockResolvedValue({ sub: "s1", unavailable: false });
    vi.mocked(setPullimMemberGrade).mockResolvedValue();
    const r = await POST(postReq({ grade: "중1" }));
    expect(r.status).toBe(200);
    expect((await r.json()).ok).toBe(true);
    expect(setPullimMemberGrade).toHaveBeenCalledWith("s1", "중1");
  });
});
