import { describe, expect, it } from "vitest";
import { buildPaths } from "./sparkline-paths";

describe("GameSparkline — buildPaths (순수)", () => {
  it("빈 배열 → 빈 path", () => {
    const { line, area } = buildPaths([], 100, 24);
    expect(line).toBe("");
    expect(area).toBe("");
  });

  it("count 모두 0 → 모두 baseline 근처", () => {
    const { line, area } = buildPaths([0, 0, 0, 0, 0, 0, 0], 100, 24);
    // 모든 y 가 height - 1 = 23 근처
    expect(line).toContain("M");
    expect(line).toContain("L");
    expect(line).toMatch(/23\.00/);
    expect(area).toContain("Z");
  });

  it("증가하는 데이터 → y 값 감소 (상승세는 위로)", () => {
    const { line } = buildPaths([1, 2, 4, 8], 100, 24);
    // 첫 점 (왼쪽) y > 마지막 점 (오른쪽) y
    // 파싱: "M 0.00 y0 L stepX y1 L 2stepX y2 L 3stepX y3"
    const match = line.match(/M (\S+) (\S+) L (\S+) (\S+) L (\S+) (\S+) L (\S+) (\S+)/);
    expect(match).toBeTruthy();
    const y0 = parseFloat(match![2]);
    const y3 = parseFloat(match![8]);
    expect(y0).toBeGreaterThan(y3); // 첫 점이 마지막 점보다 아래 (값 작음)
  });

  it("단일 점 → 첫 점 x=0", () => {
    const { line } = buildPaths([5], 100, 24);
    expect(line).toMatch(/^M 0\.00/);
  });

  it("area path 는 Z 로 종료", () => {
    const { area } = buildPaths([1, 2, 3], 100, 24);
    expect(area.endsWith("Z")).toBe(true);
    expect(area).toContain("L 100.00 24"); // 마지막 baseline 좌측 닫힘 전
  });
});
