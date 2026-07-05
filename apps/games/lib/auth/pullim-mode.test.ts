// pullim 모드 판정 + 로그인/가입 리다이렉트 URL 계약 테스트.
// spec/05 §5.2·spec/09 §9.4, plan 2026-07-03 §2-D·PR-1.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const API = "https://dev-api.pullim.ai";
const LOGIN = "https://dev.pullim.ai";

async function loadMode() {
  vi.resetModules();
  return import("./pullim-mode");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("pullim-mode — all-or-nothing 토글", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("둘 다 미설정 = legacy(PULLIM_MODE=false)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", "");
    const m = await loadMode();
    expect(m.PULLIM_MODE).toBe(false);
    expect(m.PULLIM_DOMAIN_API_URL).toBe("");
    expect(m.PULLIM_LOGIN_ORIGIN).toBe("");
  });

  it("둘 다 설정 = pullim 모드(PULLIM_MODE=true), trailing slash strip", async () => {
    vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", API + "/");
    vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", LOGIN + "/");
    const m = await loadMode();
    expect(m.PULLIM_MODE).toBe(true);
    expect(m.PULLIM_DOMAIN_API_URL).toBe(API); // slash 제거
    expect(m.PULLIM_LOGIN_ORIGIN).toBe(LOGIN);
  });

  it("🔴 DOMAIN_API_URL 만 설정 = fail-fast(throw)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", API);
    vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", "");
    await expect(loadMode()).rejects.toThrow(/all-or-nothing/);
  });

  it("🔴 LOGIN_ORIGIN 만 설정 = fail-fast(throw)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", LOGIN);
    await expect(loadMode()).rejects.toThrow(/all-or-nothing/);
  });
});

describe("login-redirect — 로그인·가입 대칭 URL", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DOMAIN_API_URL", API);
    vi.stubEnv("NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN", LOGIN);
  });

  it("pullimLoginUrl/pullimSignupUrl = SITE 호스트 + next(encoded)", async () => {
    vi.resetModules();
    const { pullimLoginUrl, pullimSignupUrl } = await import("./login-redirect");
    const next = "https://dev-games.pullim.ai/home?x=1";
    expect(pullimLoginUrl(next)).toBe(
      `${LOGIN}/login?next=${encodeURIComponent(next)}`,
    );
    expect(pullimSignupUrl(next)).toBe(
      `${LOGIN}/signup?next=${encodeURIComponent(next)}`,
    );
  });

  it("next 의 특수문자(쿼리·서브패스)가 encode 되어 오픈리다이렉트 파싱 안전", async () => {
    vi.resetModules();
    const { pullimLoginUrl } = await import("./login-redirect");
    const next = "https://dev-games.pullim.ai/games/x?a=b&c=d";
    const url = pullimLoginUrl(next);
    expect(url.startsWith(`${LOGIN}/login?next=`)).toBe(true);
    expect(url).not.toContain("&c=d"); // encode 되어 raw & 로 안 샘
    expect(decodeURIComponent(url.split("next=")[1])).toBe(next);
  });
});
