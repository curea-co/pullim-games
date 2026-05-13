import { describe, it, expect } from "vitest";
import { checkTagging } from "./checkTagging";
import type { Token } from "../schema";

const tokens: Token[] = [
  { id: "t1", text: "고양이", pos: "명사" },
  { id: "t2", text: "가", pos: "조사" },
  { id: "t3", text: "꽃", pos: "명사" },
  { id: "t4", text: "을", pos: "조사" },
  { id: "t5", text: "본다", pos: "동사" },
];

describe("checkTagging", () => {
  it("모두 정답", () => {
    const result = checkTagging(
      ["명사", "조사", "명사", "조사", "동사"],
      tokens,
    );
    expect(result.allCorrect).toBe(true);
    expect(result.correctCount).toBe(5);
    expect(result.totalCount).toBe(5);
    expect(result.perToken).toEqual([true, true, true, true, true]);
  });

  it("일부 오답", () => {
    const result = checkTagging(
      ["명사", "조사", "명사", "조사", "형용사"],
      tokens,
    );
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(4);
    expect(result.perToken).toEqual([true, true, true, true, false]);
  });

  it("null 입력은 오답", () => {
    const result = checkTagging(
      ["명사", null, "명사", "조사", "동사"],
      tokens,
    );
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(4);
    expect(result.perToken[1]).toBe(false);
  });

  it("모두 null", () => {
    const result = checkTagging([null, null, null, null, null], tokens);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(0);
  });

  it("길이 불일치 시 throw", () => {
    expect(() => checkTagging(["명사"], tokens)).toThrow(/length/);
  });
});
