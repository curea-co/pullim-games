// CSRF double-submit 헬퍼 단위 테스트.
import { describe, expect, it } from "vitest";
import { createCsrf } from "./csrf";

const csrf = createCsrf({ cookieName: "test-csrf" });

describe("createCsrf — issue", () => {
  it("64 hex 토큰 + 쿠키 헤더(Path=/, SameSite=Strict) 발급", () => {
    const { token, cookieHeader } = csrf.issue({ isProduction: false });
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(cookieHeader).toContain("test-csrf=");
    expect(cookieHeader).toContain("Path=/");
    expect(cookieHeader).toContain("SameSite=Strict");
    expect(cookieHeader).not.toContain("Secure");
  });

  it("production 에서는 Secure 플래그 부착", () => {
    const { cookieHeader } = csrf.issue({ isProduction: true });
    expect(cookieHeader).toContain("Secure");
  });
});

describe("createCsrf — readCookieToken", () => {
  it("쿠키 헤더에서 토큰 추출", () => {
    expect(csrf.readCookieToken("a=1; test-csrf=abc; b=2")).toBe("abc");
  });
  it("쿠키 없으면 null", () => {
    expect(csrf.readCookieToken("other=1")).toBeNull();
    expect(csrf.readCookieToken(null)).toBeNull();
  });
});

describe("createCsrf — verify (double-submit)", () => {
  it("쿠키 토큰 == 헤더 토큰이면 valid", () => {
    const { token } = csrf.issue();
    expect(csrf.verify(token, token)).toBe(true);
  });
  it("불일치면 false", () => {
    const a = csrf.issue().token;
    const b = csrf.issue().token;
    expect(csrf.verify(a, b)).toBe(false);
  });
  it("한쪽 없으면 false", () => {
    const { token } = csrf.issue();
    expect(csrf.verify(token, null)).toBe(false);
    expect(csrf.verify(null, token)).toBe(false);
  });
  it("형식 위조(non-hex, 길이 불일치)면 false", () => {
    expect(csrf.verify("z".repeat(64), "z".repeat(64))).toBe(false);
    expect(csrf.verify("abc", "abc")).toBe(false);
  });
});
