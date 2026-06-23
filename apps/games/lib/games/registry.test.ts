import { describe, expect, it } from "vitest";

import { games, visibleGames } from "./registry";

// 중등 재포지셔닝(2026-06-23) — 고등 전용 게임은 보관(stage:"high").
// visibleGames = 노출 표면 기준(허브·추천·about·대시보드). 라우팅은 전체 games 유지.
// 근거: proc/plan/2026-06-23_middle-school-repositioning.md.
describe("registry — 보관(stage:high) 노출 제어", () => {
  it("visibleGames 는 stage:'high' 게임을 제외한다", () => {
    expect(visibleGames.every((g) => g.meta.stage !== "high")).toBe(true);
  });

  it("보관 게임(physics-vector·chemistry-balance)은 전체 games 엔 있고 visibleGames 엔 없다", () => {
    const archived = ["physics-vector", "chemistry-balance"];
    for (const id of archived) {
      expect(games.some((g) => g.meta.id === id)).toBe(true); // 라우트·콘텐츠 유지(삭제 아님)
      expect(visibleGames.some((g) => g.meta.id === id)).toBe(false); // 노출 제외
    }
  });

  it("stage 미지정 게임은 노출된다(기본=중등)", () => {
    const middle = games.filter((g) => g.meta.stage !== "high");
    expect(middle.length).toBe(visibleGames.length);
    expect(visibleGames.length).toBeLessThan(games.length); // 최소 1개는 보관
  });
});
