// 서버측 pullim sub introspection 테스트 (mock fetch, env stub).
import { describe, it, expect, afterEach, vi } from "vitest";

const API = "https://dev-api.pullim.ai";

async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", API);
  vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", "https://dev.pullim.ai");
  return import("./pullim-introspect");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const res = (status: number, body?: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("resolvePullimSub — 서버 /games/me introspection (미인증 vs 장애 구분)", () => {
  it("200 + {sub} → {sub, unavailable:false}, `*-pullim-at` 쿠키만 forward", async () => {
    let sentCookie = "";
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
      sentCookie = (init?.headers as Record<string, string>)?.cookie ?? "";
      return res(200, { sub: "sub_1" });
    }));
    const { resolvePullimSub } = await load();
    const r = await resolvePullimSub("__Secure-dev-pullim-at=abc; pullim_games_guest=1; other=x");
    expect(r).toEqual({ sub: "sub_1", unavailable: false });
    expect(sentCookie).toBe("__Secure-dev-pullim-at=abc"); // games 쿠키 누출 없음
  });

  it("401 → {sub:null, unavailable:false}(미인증 확정)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(401)));
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("local-pullim-at=x")).toEqual({ sub: null, unavailable: false });
  });

  it("🔴 5xx → {sub:null, unavailable:true}(장애 — 라우트가 503)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(503)));
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("local-pullim-at=x")).toEqual({ sub: null, unavailable: true });
  });

  it("🔴 네트워크·timeout → {sub:null, unavailable:true}(장애)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("local-pullim-at=x")).toEqual({ sub: null, unavailable: true });
  });

  it("403·기타 4xx → {sub:null, unavailable:false}(미인증 취급, 장애 아님)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(403)));
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("local-pullim-at=x")).toEqual({ sub: null, unavailable: false });
  });

  it("pullim-at 쿠키 없으면 fetch 없이 {sub:null, unavailable:false}", async () => {
    const fetchFn = vi.fn(async () => res(200, { sub: "x" }));
    vi.stubGlobal("fetch", fetchFn);
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("pullim_games_guest=1")).toEqual({ sub: null, unavailable: false });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sub 누락(계약 위반) → {sub:null, unavailable:false}", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(200, { globalRole: "user" })));
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("local-pullim-at=x")).toEqual({ sub: null, unavailable: false });
  });
});

describe("resolvePullimSub — legacy 모드(env 미설정)", () => {
  it("PULLIM_MODE 아니면 fetch 없이 {sub:null, unavailable:false}", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", "");
    const fetchFn = vi.fn();
    vi.stubGlobal("fetch", fetchFn);
    const { resolvePullimSub } = await import("./pullim-introspect");
    expect(await resolvePullimSub("local-pullim-at=x")).toEqual({ sub: null, unavailable: false });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
