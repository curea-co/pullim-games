import { describe, it, expect } from "vitest";
import { checkAssembly } from "./checkAssembly";
import type { ComponentCard, Slot } from "../schema";

const slots: Slot[] = [
  { id: "s1", correctCardId: "c-tree-1" },
  { id: "s2", correctCardId: "c-tree-2" },
];

const cards: ComponentCard[] = [
  { id: "c-tree-1", text: "木" },
  { id: "c-tree-2", text: "木" },
  { id: "c-sun", text: "日" },
];

describe("checkAssembly", () => {
  it("같은 순서 정답", () => {
    const result = checkAssembly(["c-tree-1", "c-tree-2"], slots, cards);
    expect(result.allCorrect).toBe(true);
    expect(result.correctCount).toBe(2);
    expect(result.perSlot).toEqual([true, true]);
  });

  it("동일 부수 카드 순서 뒤바뀜도 정답 (BUG-1 fix)", () => {
    const result = checkAssembly(["c-tree-2", "c-tree-1"], slots, cards);
    expect(result.allCorrect).toBe(true);
    expect(result.correctCount).toBe(2);
    expect(result.perSlot).toEqual([true, true]);
  });

  it("다른 부수 카드는 오답", () => {
    const result = checkAssembly(["c-sun", "c-tree-2"], slots, cards);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(1);
    expect(result.perSlot).toEqual([false, true]);
  });

  it("null 입력은 오답", () => {
    const result = checkAssembly(["c-tree-1", null], slots, cards);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(1);
  });

  it("길이 불일치 시 throw", () => {
    expect(() => checkAssembly(["c-tree-1"], slots, cards)).toThrow(/length/);
  });

  it("동일 부수 3개 슬롯 (森 케이스) — 어느 순서든 정답", () => {
    const treeSlots: Slot[] = [
      { id: "s1", correctCardId: "c-tree-1" },
      { id: "s2", correctCardId: "c-tree-2" },
      { id: "s3", correctCardId: "c-tree-3" },
    ];
    const treeCards: ComponentCard[] = [
      { id: "c-tree-1", text: "木" },
      { id: "c-tree-2", text: "木" },
      { id: "c-tree-3", text: "木" },
    ];
    const result = checkAssembly(
      ["c-tree-3", "c-tree-1", "c-tree-2"],
      treeSlots,
      treeCards,
    );
    expect(result.allCorrect).toBe(true);
  });
});
