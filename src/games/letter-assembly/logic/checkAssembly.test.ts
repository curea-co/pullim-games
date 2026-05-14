import { describe, it, expect } from "vitest";
import { checkAssembly } from "./checkAssembly";
import type { Slot } from "../schema";

const slots: Slot[] = [
  { id: "s1", correctCardId: "c-tree-1" },
  { id: "s2", correctCardId: "c-tree-2" },
];

describe("checkAssembly", () => {
  it("모두 정답", () => {
    const result = checkAssembly(["c-tree-1", "c-tree-2"], slots);
    expect(result.allCorrect).toBe(true);
    expect(result.correctCount).toBe(2);
    expect(result.perSlot).toEqual([true, true]);
  });

  it("순서 뒤바뀜 = 오답", () => {
    const result = checkAssembly(["c-tree-2", "c-tree-1"], slots);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(0);
    expect(result.perSlot).toEqual([false, false]);
  });

  it("null 입력은 오답", () => {
    const result = checkAssembly(["c-tree-1", null], slots);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(1);
  });

  it("길이 불일치 시 throw", () => {
    expect(() => checkAssembly(["c-tree-1"], slots)).toThrow(/length/);
  });
});
