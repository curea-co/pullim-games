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

describe("resolvePullimSub — 서버 /games/me introspection", () => {
  it("200 + {sub} → sub, `*-pullim-at` 쿠키만 forward", async () => {
    let sentCookie = "";
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
      sentCookie = (init?.headers as Record<string, string>)?.cookie ?? "";
      return res(200, { sub: "sub_1" });
    }));
    const { resolvePullimSub } = await load();
    const sub = await resolvePullimSub("__Secure-dev-pullim-at=abc; pullim_games_guest=1; other=x");
    expect(sub).toBe("sub_1");
    // games 쿠키(guest·other) 누출 없이 pullim-at 만 forward
    expect(sentCookie).toBe("__Secure-dev-pullim-at=abc");
  });

  it("401 → null(미인증)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(401)));
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("local-pullim-at=x")).toBeNull();
  });

  it("🔴 5xx·네트워크 → null(쓰기 fail-closed)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(503)));
    let m = await load();
    expect(await m.resolvePullimSub("local-pullim-at=x")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    m = await load();
    expect(await m.resolvePullimSub("local-pullim-at=x")).toBeNull();
  });

  it("pullim-at 쿠키 없으면 fetch 없이 null", async () => {
    const fetchFn = vi.fn(async () => res(200, { sub: "x" }));
    vi.stubGlobal("fetch", fetchFn);
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("pullim_games_guest=1")).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sub 누락(계약 위반) → null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(200, { globalRole: "user" })));
    const { resolvePullimSub } = await load();
    expect(await resolvePullimSub("local-pullim-at=x")).toBeNull();
  });
});

describe("resolvePullimSub — legacy 모드(env 미설정)", () => {
  it("PULLIM_MODE 아니면 fetch 없이 null", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", "");
    const fetchFn = vi.fn();
    vi.stubGlobal("fetch", fetchFn);
    const { resolvePullimSub } = await import("./pullim-introspect");
    expect(await resolvePullimSub("local-pullim-at=x")).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
