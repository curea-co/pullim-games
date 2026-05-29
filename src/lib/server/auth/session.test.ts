// 세션 쿠키 헬퍼 단위 테스트 (순수 함수 — DB 불필요).
import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  buildClearSessionCookie,
  buildSessionCookie,
  readSessionTokenFromCookie,
} from "./session";

describe("readSessionTokenFromCookie", () => {
  it("쿠키 헤더에서 세션 토큰 추출", () => {
    expect(readSessionTokenFromCookie(`a=1; ${SESSION_COOKIE}=tok123; b=2`)).toBe("tok123");
  });
  it("세션 쿠키 없으면 null", () => {
    expect(readSessionTokenFromCookie("other=1")).toBeNull();
    expect(readSessionTokenFromCookie(null)).toBeNull();
  });
});

describe("buildSessionCookie", () => {
  it("HttpOnly + SameSite=Lax + Max-Age 포함", () => {
    const c = buildSessionCookie("tok", Date.now() + 60_000);
    expect(c).toContain(`${SESSION_COOKIE}=tok`);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toMatch(/Max-Age=\d+/);
  });
});

describe("buildClearSessionCookie", () => {
  it("Max-Age=0 으로 즉시 만료", () => {
    const c = buildClearSessionCookie();
    expect(c).toContain(`${SESSION_COOKIE}=`);
    expect(c).toContain("Max-Age=0");
  });
});
