import { describe, it, expect } from "vitest";
import { checkAssignments } from "./checkAssignments";
import type { Item } from "../schema";

const items: Item[] = [
  { id: "i1", label: "잉어", categoryId: "fish" },
  { id: "i2", label: "상어", categoryId: "fish" },
  { id: "i3", label: "거북", categoryId: "reptile" },
  { id: "i4", label: "참새", categoryId: "bird" },
];

describe("checkAssignments", () => {
  it("모두 정답", () => {
    const result = checkAssignments(
      { i1: "fish", i2: "fish", i3: "reptile", i4: "bird" },
      items,
    );
    expect(result.allCorrect).toBe(true);
    expect(result.correctCount).toBe(4);
    expect(result.totalCount).toBe(4);
  });

  it("일부 오답", () => {
    const result = checkAssignments(
      { i1: "fish", i2: "reptile", i3: "reptile", i4: "bird" },
      items,
    );
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(3);
    expect(result.perItem.i2).toBe(false);
    expect(result.perItem.i1).toBe(true);
  });

  it("미배치 (null) 은 오답", () => {
    const result = checkAssignments(
      { i1: "fish", i2: "fish", i3: null, i4: "bird" },
      items,
    );
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(3);
    expect(result.perItem.i3).toBe(false);
  });

  it("빈 배치 — 모두 오답", () => {
    const result = checkAssignments({}, items);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(0);
  });

  it("모두 같은 카테고리 — 정답 1개만", () => {
    const result = checkAssignments(
      { i1: "fish", i2: "fish", i3: "fish", i4: "fish" },
      items,
    );
    expect(result.correctCount).toBe(2);
    expect(result.perItem.i1).toBe(true);
    expect(result.perItem.i2).toBe(true);
    expect(result.perItem.i3).toBe(false);
    expect(result.perItem.i4).toBe(false);
  });
});
