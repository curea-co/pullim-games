import { describe, it, expect } from "vitest";
import { checkRatio } from "./checkRatio";

describe("checkRatio", () => {
  it("정확 일치 → true", () => {
    expect(checkRatio([9, 3, 3, 1], [9, 3, 3, 1])).toBe(true);
  });

  it("배수 입력 → true (약분 동치)", () => {
    expect(checkRatio([18, 6, 6, 2], [9, 3, 3, 1])).toBe(true);
  });

  it("순서 다르면 false", () => {
    expect(checkRatio([1, 3, 3, 9], [9, 3, 3, 1])).toBe(false);
  });

  it("길이 다르면 false", () => {
    expect(checkRatio([3, 1], [9, 3, 3, 1])).toBe(false);
  });

  it("0 포함 정답 — 모두 우성 [1,0]", () => {
    expect(checkRatio([1, 0], [1, 0])).toBe(true);
    expect(checkRatio([5, 0], [1, 0])).toBe(true);
    expect(checkRatio([0, 1], [1, 0])).toBe(false);
  });

  it("3:1 vs 1:1 → false", () => {
    expect(checkRatio([3, 1], [1, 1])).toBe(false);
  });

  it("1:1 vs 2:2 → true", () => {
    expect(checkRatio([2, 2], [1, 1])).toBe(true);
  });

  it("모두 0 입력 → false", () => {
    expect(checkRatio([0, 0, 0, 0], [9, 3, 3, 1])).toBe(false);
  });

  it("음수 입력 → false", () => {
    expect(checkRatio([-1, 3, 3, 1], [9, 3, 3, 1])).toBe(false);
  });
});
