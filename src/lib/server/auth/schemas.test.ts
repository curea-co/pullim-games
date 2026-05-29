// auth zod 스키마 단위 테스트.
import { describe, expect, it } from "vitest";
import { LoginSchema, SignupSchema } from "./schemas";

const base = { email: "a@b.com", password: "abcd1234", over14: true as const };

describe("SignupSchema", () => {
  it("유효 입력 통과 + 이메일 소문자 정규화", () => {
    const r = SignupSchema.safeParse({ ...base, email: "A@B.com" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("a@b.com");
  });
  it("8자 미만 비번 거부", () => {
    expect(SignupSchema.safeParse({ ...base, password: "ab12" }).success).toBe(false);
  });
  it("영문/숫자 미포함 비번 거부", () => {
    expect(SignupSchema.safeParse({ ...base, password: "abcdefgh" }).success).toBe(false);
    expect(SignupSchema.safeParse({ ...base, password: "12345678" }).success).toBe(false);
  });
  it("UTF-8 72바이트 초과 비번 거부(한글 25자=75B)", () => {
    const pw = "가".repeat(25) + "1a"; // 77 bytes
    expect(SignupSchema.safeParse({ ...base, password: pw }).success).toBe(false);
  });
  it("over14 누락/false 거부", () => {
    expect(SignupSchema.safeParse({ email: base.email, password: base.password }).success).toBe(false);
    expect(SignupSchema.safeParse({ ...base, over14: false }).success).toBe(false);
  });
  it("잘못된 이메일 거부", () => {
    expect(SignupSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });
  it("정의 외 필드(strict) 거부", () => {
    expect(SignupSchema.safeParse({ ...base, role: "admin" }).success).toBe(false);
  });
  it("짧은 fingerprint(<8) 거부, 유효 fingerprint 허용", () => {
    expect(SignupSchema.safeParse({ ...base, fingerprint: "short" }).success).toBe(false);
    expect(SignupSchema.safeParse({ ...base, fingerprint: "fp-123456789" }).success).toBe(true);
  });
});

describe("LoginSchema", () => {
  it("유효 입력 통과", () => {
    expect(LoginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("빈 비번 거부", () => {
    expect(LoginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
