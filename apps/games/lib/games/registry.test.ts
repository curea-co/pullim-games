import { describe, expect, it } from "vitest";

import { games, visibleGames } from "./registry";

// 중·고등 타겟(2026-06-26) — 초등=풀림 주니어(별도 앱)만 제외, 중·고 게임은 전부 노출.
// stage:"high" 보관 필터는 유지되나 현재 태깅된 게임이 0 → visibleGames === games.
// 근거: proc/plan/2026-06-26_middle-high-target.md.
describe("registry — 발견 표면 노출(중·고 둘 다 노출)", () => {
  it("현재 보관(stage:'high') 게임이 없어 visibleGames === 전체 games", () => {
    expect(visibleGames.length).toBe(games.length);
    expect(games.every((g) => g.meta.stage !== "high")).toBe(true);
  });

  it("고등 게임(physics-vector·chemistry-balance)도 노출된다(중·고 타겟)", () => {
    for (const id of ["physics-vector", "chemistry-balance"]) {
      expect(visibleGames.some((g) => g.meta.id === id)).toBe(true);
    }
  });

  it("visibleGames 필터는 stage:'high' 만 제외하는 계약을 유지", () => {
    expect(visibleGames.every((g) => g.meta.stage !== "high")).toBe(true);
  });
});
