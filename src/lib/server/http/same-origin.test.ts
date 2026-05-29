// same-origin 가드 단위 테스트.
import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./same-origin";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost:3033/api/auth/login", { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
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
