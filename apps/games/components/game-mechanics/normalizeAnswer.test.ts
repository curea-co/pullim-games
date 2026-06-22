import { describe, expect, it } from "vitest";
import { normalizeAnswer } from "./normalizeAnswer";

describe("normalizeAnswer — 구두점 허용", () => {
  it("trailing 온점 무시", () => {
    expect(normalizeAnswer("Nice to meet you.")).toBe(
      normalizeAnswer("Nice to meet you"),
    );
  });

  it("물음표·느낌표 무시", () => {
    expect(normalizeAnswer("How are you?")).toBe(
      normalizeAnswer("how are you"),
    );
    expect(normalizeAnswer("Hello!")).toBe(normalizeAnswer("hello"));
  });

  it("반점·세미콜론·콜론 무시", () => {
    expect(normalizeAnswer("Hello, world.")).toBe(
      normalizeAnswer("hello world"),
    );
    expect(normalizeAnswer("note: this")).toBe(normalizeAnswer("note this"));
  });

  it("축약형 아포스트로피 (I'm / don't)", () => {
    expect(normalizeAnswer("I'm fine.")).toBe(normalizeAnswer("im fine"));
    expect(normalizeAnswer("don't")).toBe(normalizeAnswer("dont"));
    // curly apostrophe (’) 도 동일 처리
    expect(normalizeAnswer("don’t")).toBe(normalizeAnswer("dont"));
  });

  it("하이픈 = 공백", () => {
    expect(normalizeAnswer("ice-cream")).toBe(normalizeAnswer("ice cream"));
    expect(normalizeAnswer("well-known")).toBe(normalizeAnswer("well known"));
  });

  it("한국어 fullwidth 구두점 무시", () => {
    expect(normalizeAnswer("안녕!")).toBe(normalizeAnswer("안녕"));
    expect(normalizeAnswer("안녕？")).toBe(normalizeAnswer("안녕")); // ？
    expect(normalizeAnswer("문장。")).toBe(normalizeAnswer("문장")); // 。
  });

  it("대소문자 무시", () => {
    expect(normalizeAnswer("HELLO")).toBe(normalizeAnswer("hello"));
  });

  it("앞뒤·중간 공백 정규화", () => {
    expect(normalizeAnswer("  multi  space  ")).toBe("multi space");
  });

  it("순수 구두점만 있으면 빈 문자열", () => {
    expect(normalizeAnswer("!?.,")).toBe("");
  });

  it("정확히 일치하는 입력은 그대로 매칭", () => {
    expect(normalizeAnswer("apple")).toBe("apple");
    expect(normalizeAnswer("apple")).toBe(normalizeAnswer("apple"));
  });
});
