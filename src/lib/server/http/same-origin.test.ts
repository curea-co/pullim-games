// same-origin 가드 단위 테스트.
import { afterEach, describe, expect, it, vi } from "vitest";
import { isSameOriginRequest } from "./same-origin";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost:3033/api/auth/login", { method: "POST", headers });
}

afterEach(() => vi.unstubAllEnvs());

describe("isSameOriginRequest (dev — request.url fallback 신뢰)", () => {
  it("Origin·Referer 모두 없으면 거부", () => {
    expect(isSameOriginRequest(req({}))).toBe(false);
  });
  it("Origin 이 요청 origin 과 일치하면 허용", () => {
    expect(isSameOriginRequest(req({ origin: "http://localhost:3033" }))).toBe(true);
  });
  it("Origin 불일치면 거부", () => {
    expect(isSameOriginRequest(req({ origin: "https://evil.example.com" }))).toBe(false);
  });
  it("Origin 없고 Referer 가 일치 origin 이면 허용", () => {
    expect(isSameOriginRequest(req({ referer: "http://localhost:3033/login" }))).toBe(true);
  });
  it("Referer 가 외부면 거부", () => {
    expect(isSameOriginRequest(req({ referer: "https://evil.example.com/x" }))).toBe(false);
  });
});

describe("isSameOriginRequest (production)", () => {
  it("prod + env 미설정이어도 Origin 이 요청 Host 와 일치하면 허용(정상 same-origin)", () => {
    vi.stubEnv("NODE_ENV", "production");
    // CSRF 토큰이 Host-spoof 백스톱이므로, 정상 same-origin POST 를 막지 않는다.
    expect(isSameOriginRequest(req({ origin: "http://localhost:3033" }))).toBe(true);
  });
  it("prod + NEXT_PUBLIC_SITE_ORIGIN 일치하면 허용", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://games.pullim.app");
    expect(isSameOriginRequest(req({ origin: "https://games.pullim.app" }))).toBe(true);
  });
  it("prod + 요청 Host 도 allowlist 도 아닌 외부 origin 이면 거부", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isSameOriginRequest(req({ origin: "https://evil.example.com" }))).toBe(false);
  });
});
