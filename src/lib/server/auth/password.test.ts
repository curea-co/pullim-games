// 비밀번호 해시·상수시간 검증 단위 테스트.
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordConstantTime } from "./password";

describe("password hashing", () => {
  it("해시 후 같은 비번이면 verify true, 틀리면 false", async () => {
    const hash = await hashPassword("abcd1234");
    expect(hash).not.toBe("abcd1234"); // 평문 저장 금지
    expect(await verifyPassword("abcd1234", hash)).toBe(true);
    expect(await verifyPassword("wrongpass1", hash)).toBe(false);
  });

  it("verifyPasswordConstantTime: hash=null 이면 더미 compare 후 false(throw X)", async () => {
    await expect(verifyPasswordConstantTime("anything1", null)).resolves.toBe(false);
  });

  it("verifyPasswordConstantTime: 실제 해시와 비교 동작", async () => {
    const hash = await hashPassword("abcd1234");
    expect(await verifyPasswordConstantTime("abcd1234", hash)).toBe(true);
    expect(await verifyPasswordConstantTime("nope12345", hash)).toBe(false);
  });
});
