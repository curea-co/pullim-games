import { describe, it, expect } from "vitest";
import { checkHotspot } from "./checkHotspot";
import type { Region } from "../schema";

const regions: Region[] = [
  {
    id: "r1",
    bbox: { x: 10, y: 10, width: 20, height: 20 },
    correctCardId: "c-petal",
  },
  {
    id: "r2",
    bbox: { x: 40, y: 10, width: 20, height: 20 },
    correctCardId: "c-stamen",
  },
];

describe("checkHotspot", () => {
  it("모두 정답", () => {
    const result = checkHotspot(["c-petal", "c-stamen"], regions);
    expect(result.allCorrect).toBe(true);
    expect(result.correctCount).toBe(2);
    expect(result.perRegion).toEqual([true, true]);
  });

  it("순서 뒤바뀜 = 오답", () => {
    const result = checkHotspot(["c-stamen", "c-petal"], regions);
    expect(result.allCorrect).toBe(false);
    expect(result.correctCount).toBe(0);
  });

  it("null 입력은 오답", () => {
    const result = checkHotspot(["c-petal", null], regions);
    expect(result.correctCount).toBe(1);
    expect(result.allCorrect).toBe(false);
  });

  it("길이 불일치 시 throw", () => {
    expect(() => checkHotspot(["c-petal"], regions)).toThrow(/length/);
  });
});
