import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/core/fsrs";
import { selectCardsForMode } from "./select-for-mode";

const baseTime = new Date("2026-05-20T00:00:00Z");

function makeCards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    srs: createInitialState(baseTime),
  }));
}

describe("selectCardsForMode", () => {
  it("default — fallbackCount 그대로 전체 반환", () => {
    const cards = makeCards(10);
    expect(selectCardsForMode(cards, "default", cards.length, baseTime)).toHaveLength(10);
  });

  it("review-queue — N=5로 잘림 (cards 충분)", () => {
    const cards = makeCards(10);
    expect(
      selectCardsForMode(cards, "review-queue", cards.length, baseTime),
    ).toHaveLength(5);
  });

  it("review-queue — cards.length < 5 시 cards.length 반환 (빈 풀 안전)", () => {
    const cards = makeCards(3);
    expect(
      selectCardsForMode(cards, "review-queue", cards.length, baseTime),
    ).toHaveLength(3);
  });

  it("time-attack — fallbackCount 그대로 (Phase 3에서 별도 정책)", () => {
    const cards = makeCards(8);
    expect(
      selectCardsForMode(cards, "time-attack", cards.length, baseTime),
    ).toHaveLength(8);
  });

  it("deep-recall — fallbackCount 그대로 (Phase 4에서 별도 정책)", () => {
    const cards = makeCards(8);
    expect(
      selectCardsForMode(cards, "deep-recall", cards.length, baseTime),
    ).toHaveLength(8);
  });

  it("review-queue 빈 풀 — 0 반환", () => {
    expect(selectCardsForMode([], "review-queue", 0, baseTime)).toHaveLength(0);
  });
});
