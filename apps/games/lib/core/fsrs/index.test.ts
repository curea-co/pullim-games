import { describe, expect, it } from "vitest";
import {
  createInitialState,
  getRetrievability,
  reviewCard,
  selectNextCards,
} from "./index";

describe("FSRS wrapper", () => {
  it("새 카드 R 은 1.0", () => {
    const s = createInitialState();
    expect(getRetrievability(s)).toBe(1.0);
  });

  it("리뷰 후 reviewCount 증가 + lastReviewAt 갱신", () => {
    const s0 = createInitialState();
    const now = new Date("2026-05-08T00:00:00Z");
    const s1 = reviewCard(s0, "good", now);
    expect(s1.reviewCount).toBe(1);
    expect(s1.lastReviewAt).toEqual(now);
    const s2 = reviewCard(s1, "good", new Date("2026-05-09T00:00:00Z"));
    expect(s2.reviewCount).toBe(2);
  });

  it("Again > Good > Easy — 다음 due 가 다름", () => {
    const s0 = createInitialState(new Date("2026-05-08T00:00:00Z"));
    const sAgain = reviewCard(s0, "again", new Date("2026-05-08T00:01:00Z"));
    const sGood = reviewCard(s0, "good", new Date("2026-05-08T00:01:00Z"));
    const sEasy = reviewCard(s0, "easy", new Date("2026-05-08T00:01:00Z"));

    // Easy 가 가장 멀리 잡혀야 함
    expect(sEasy.fsrsCard.due.getTime()).toBeGreaterThan(
      sGood.fsrsCard.due.getTime(),
    );
    expect(sGood.fsrsCard.due.getTime()).toBeGreaterThan(
      sAgain.fsrsCard.due.getTime(),
    );
  });

  it("selectNextCards — R 낮은 순 정렬 + count 제한", () => {
    const old = new Date("2026-05-01T00:00:00Z");
    const recent = new Date("2026-05-08T00:00:00Z");

    const cards = [
      // 오래 전 학습 (R 낮을 것)
      {
        id: "stale",
        srs: reviewCard(createInitialState(old), "good", old),
      },
      // 새 카드 (R = 1.0, 우선순위 낮아야)
      { id: "fresh", srs: createInitialState() },
      // 최근 학습 (R 높음)
      {
        id: "recent",
        srs: reviewCard(createInitialState(recent), "good", recent),
      },
    ];

    const next = selectNextCards(cards, 2, recent);
    expect(next.length).toBe(2);
    // stale 이 먼저 와야
    expect(next[0]?.id).toBe("stale");
  });
});
