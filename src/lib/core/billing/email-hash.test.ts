// email → sha256 hash 검증.
// SPEC §05.6 — 원본 이메일은 절대 서버 전송 X.

import { describe, expect, it } from "vitest";
import { hashEmail, normalizeEmail } from "./email-hash";

// RFC: sha256("user@example.com") — Node crypto.createHash 로 사전 계산.
//   $ node -e "console.log(require('crypto').createHash('sha256').update('user@example.com').digest('hex'))"
//   → b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514
const HASH_USER_AT_EXAMPLE =
  "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514";

describe("hashEmail", () => {
  it("동일 이메일 → 동일 hash (deterministic)", async () => {
    const a = await hashEmail("user@example.com");
    const b = await hashEmail("user@example.com");
    expect(a).toBe(b);
  });

  it("RFC sha256 일치 — user@example.com", async () => {
    const hash = await hashEmail("user@example.com");
    expect(hash).toBe(HASH_USER_AT_EXAMPLE);
  });

  it("hex 64자 lowercase", async () => {
    const hash = await hashEmail("user@example.com");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalize — 대소문자·공백 차이 무시", async () => {
    const a = await hashEmail("User@Example.com");
    const b = await hashEmail("  user@example.com  ");
    const c = await hashEmail("user@example.com");
    expect(a).toBe(c);
    expect(b).toBe(c);
  });

  it("다른 이메일 → 다른 hash (collision 방지)", async () => {
    const a = await hashEmail("user@example.com");
    const b = await hashEmail("user2@example.com");
    expect(a).not.toBe(b);
  });

  it("plus-aliasing 은 별 신청자 (다른 이메일로 처리)", async () => {
    const a = await hashEmail("user@example.com");
    const b = await hashEmail("user+tag@example.com");
    expect(a).not.toBe(b);
  });

  it("빈 문자열 → throw", async () => {
    await expect(hashEmail("")).rejects.toThrow();
    await expect(hashEmail("   ")).rejects.toThrow();
  });
});

describe("normalizeEmail", () => {
  it("lowercase + trim", () => {
    expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
  });
});
