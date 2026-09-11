// P-B 회원 재연결 — emailMatchHash 바이트 일치 계약 단위 테스트.
// 핸드오프 §1 테스트 벡터를 고정해 pullim-api 와의 해시 일치를 회귀 방지한다.
import { afterEach, describe, expect, it } from "vitest";
import { computeEmailMatchHash, getEmailMatchPepper } from "./email-match-hash";

describe("computeEmailMatchHash", () => {
  it("핸드오프 §1 테스트 벡터 재현 (pullim-api 바이트 일치)", () => {
    // salt="pb-test-salt", email="  User@Example.COM " → normalize "user@example.com"
    expect(computeEmailMatchHash("  User@Example.COM ", "pb-test-salt")).toBe(
      "d1bbcc480bd202e0abc38c0d2119fbce944b42bb7e014fe1cd22d2ef4ac63ebb",
    );
  });

  it("정규화는 trim+toLowerCase 만 — 대소문자·공백 차이는 같은 해시", () => {
    const a = computeEmailMatchHash("user@example.com", "salt");
    expect(computeEmailMatchHash("  USER@Example.CoM  ", "salt")).toBe(a);
  });

  it("provider 정규화 미적용 — gmail dot/plus 는 다른 해시(비대칭 방지)", () => {
    const plain = computeEmailMatchHash("a.b+tag@gmail.com", "salt");
    expect(computeEmailMatchHash("ab@gmail.com", "salt")).not.toBe(plain);
  });

  it("pepper 가 다르면 해시가 다르다(keyed)", () => {
    expect(computeEmailMatchHash("user@example.com", "salt-a")).not.toBe(
      computeEmailMatchHash("user@example.com", "salt-b"),
    );
  });
});

describe("getEmailMatchPepper", () => {
  const original = process.env.GAMES_EMAIL_MATCH_PEPPER;
  afterEach(() => {
    if (original === undefined) delete process.env.GAMES_EMAIL_MATCH_PEPPER;
    else process.env.GAMES_EMAIL_MATCH_PEPPER = original;
  });

  it("미설정이면 null (dormant 신호)", () => {
    delete process.env.GAMES_EMAIL_MATCH_PEPPER;
    expect(getEmailMatchPepper()).toBeNull();
  });

  it("빈 문자열이면 null", () => {
    process.env.GAMES_EMAIL_MATCH_PEPPER = "";
    expect(getEmailMatchPepper()).toBeNull();
  });

  it("설정되면 그 값", () => {
    process.env.GAMES_EMAIL_MATCH_PEPPER = "secret-pepper";
    expect(getEmailMatchPepper()).toBe("secret-pepper");
  });
});
