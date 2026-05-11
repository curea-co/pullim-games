import { describe, expect, it } from "vitest";
import {
  recommendTodaysGame,
  type GameSrsSnapshot,
} from "./today";
import { createInitialState, reviewCard } from "../fsrs";

describe("recommendTodaysGame", () => {
  it("빈 snapshots → 콜드 스타트 fallback", () => {
    const r = recommendTodaysGame([], "factorization");
    expect(r.gameId).toBe("factorization");
    expect(r.reason).toBe("cold-start");
  });

  it("모든 카드 미리뷰 → 콜드 스타트", () => {
    const snaps: GameSrsSnapshot[] = [
      { gameId: "g1", cardIds: ["c1", "c2"], states: new Map() },
    ];
    const r = recommendTodaysGame(snaps, "factorization");
    expect(r.reason).toBe("cold-start");
  });

  it("R 충분히 낮은 카드(< 0.85) 있으면 그 게임", () => {
    // 오래 전 학습한 카드 — R 낮을 것
    const old = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-05-08T00:00:00Z");
    const oldState = reviewCard(createInitialState(old), "good", old);

    const snaps: GameSrsSnapshot[] = [
      {
        gameId: "factorization",
        cardIds: ["c1"],
        states: new Map([["c1", oldState]]),
      },
    ];
    const r = recommendTodaysGame(snaps, "factorization", now);
    expect(r.gameId).toBe("factorization");
    expect(r.reason).toBe("low-retrievability");
  });

  it("R 충분히 높음 + 미리뷰 카드 있음 → new-cards", () => {
    const recent = new Date("2026-05-08T00:00:00Z");
    const recentState = reviewCard(
      createInitialState(recent),
      "easy",
      recent,
    );

    const snaps: GameSrsSnapshot[] = [
      {
        gameId: "factorization",
        cardIds: ["c1", "c2"],
        states: new Map([["c1", recentState]]), // c2 미리뷰
      },
    ];
    const r = recommendTodaysGame(
      snaps,
      "factorization",
      new Date("2026-05-08T01:00:00Z"),
    );
    expect(r.reason).toBe("new-cards");
    expect(r.gameId).toBe("factorization");
  });

  it("여러 게임 중 R 낮은 게임 우선", () => {
    const old = new Date("2026-01-01T00:00:00Z");
    const recent = new Date("2026-05-08T00:00:00Z");
    const now = new Date("2026-05-08T01:00:00Z");

    const oldStateA = reviewCard(createInitialState(old), "good", old);
    const recentStateB = reviewCard(
      createInitialState(recent),
      "easy",
      recent,
    );

    const snaps: GameSrsSnapshot[] = [
      {
        gameId: "game-recent",
        cardIds: ["c1"],
        states: new Map([["c1", recentStateB]]),
      },
      {
        gameId: "game-stale",
        cardIds: ["c1"],
        states: new Map([["c1", oldStateA]]),
      },
    ];
    const r = recommendTodaysGame(snaps, "factorization", now);
    expect(r.gameId).toBe("game-stale");
  });
});
