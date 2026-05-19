import { describe, expect, it } from "vitest";
import { buildDistractors } from "./index";

describe("buildDistractors", () => {
  it("빈 pool → 빈 배열", () => {
    expect(buildDistractors("answer", [], 2)).toEqual([]);
  });

  it("pool 에 correct 만 있으면 빈 배열", () => {
    expect(buildDistractors("answer", ["answer"], 2)).toEqual([]);
  });

  it("correct 제외 추출", () => {
    const result = buildDistractors("answer", ["a", "b", "answer", "c"], 2, 1);
    expect(result).not.toContain("answer");
    expect(result.length).toBe(2);
  });

  it("seed 동일 시 결과 동일 (재현 가능)", () => {
    const r1 = buildDistractors("answer", ["a", "b", "c", "d"], 2, 42);
    const r2 = buildDistractors("answer", ["a", "b", "c", "d"], 2, 42);
    expect(r1).toEqual(r2);
  });

  it("seed 다르면 결과 다를 수 있음", () => {
    const r1 = buildDistractors("answer", ["a", "b", "c", "d", "e"], 2, 1);
    const r2 = buildDistractors("answer", ["a", "b", "c", "d", "e"], 2, 100);
    // 통계적으로 같을 수도 있으나 5개 중 2개 추출 시 seed 다르면 일반적으로 다름
    // 본 테스트는 함수 호출이 throw 안 함 + 결과 length 같음만 검증
    expect(r1.length).toBe(2);
    expect(r2.length).toBe(2);
  });

  it("count 부족 — 가능한 만큼만 반환", () => {
    const result = buildDistractors("answer", ["a", "b"], 5);
    expect(result.length).toBe(2);
  });

  it("pool 중복 제거 후 추출 (변별력 같은 distractor 회피)", () => {
    const result = buildDistractors(
      "answer",
      ["a", "a", "a", "b", "c"],
      3,
      42,
    );
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });

  it("default count=2", () => {
    const result = buildDistractors("answer", ["a", "b", "c", "d"], undefined, 42);
    expect(result.length).toBe(2);
  });
});
