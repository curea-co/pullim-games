import { describe, it, expect } from "vitest";
import { checkCloze } from "./checkCloze";
import type { BlankSlot } from "../schema";

const blanks: BlankSlot[] = [
  { id: "b1", correctCardId: "c-cat" },
  { id: "b2", correctCardId: "c-saw" },
  { id: "b3", correctCardId: "c-bird" },
];

describe("checkCloze", () => {
  it("모두 정답", () => {
    const result = checkCloze(["c-cat", "c-saw", "c-bird"], blanks);
    expect(result.allCorrect).toBe(true);
    expect(result.correctCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.perBlank).toEqual([true, true, true]);
  });

  it("일부 오답", () => {
    const result = checkCloze(["c-cat", "c-saw", "c-mouse"], blanks);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(2);
    expect(result.perBlank).toEqual([true, true, false]);
  });

  it("null 입력은 오답", () => {
    const result = checkCloze(["c-cat", null, "c-bird"], blanks);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(2);
    expect(result.perBlank[1]).toBe(false);
  });

  it("모두 null", () => {
    const result = checkCloze([null, null, null], blanks);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(0);
  });

  it("길이 불일치 시 throw", () => {
    expect(() => checkCloze(["c-cat"], blanks)).toThrow(/length/);
  });
});
