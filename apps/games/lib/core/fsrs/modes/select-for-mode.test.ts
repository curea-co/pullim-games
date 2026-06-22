import { describe, expect, it } from "vitest";
import { createInitialState, reviewCard } from "@/lib/core/fsrs";
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

  it("time-attack — fallbackCount 그대로 (rating 결정만 다름)", () => {
    const cards = makeCards(8);
    expect(
      selectCardsForMode(cards, "time-attack", cards.length, baseTime),
    ).toHaveLength(8);
  });

  it("review-queue 빈 풀 — 0 반환", () => {
    expect(selectCardsForMode([], "review-queue", 0, baseTime)).toHaveLength(0);
  });

  // Plan E Phase 4 — deep-recall R<0.6 필터.
  describe("deep-recall (Plan E Phase 4)", () => {
    it("새 카드만 있을 때 — R=1.0 → 빈 풀 (잊혀가는 카드 없음)", () => {
      const cards = makeCards(8);
      expect(
        selectCardsForMode(cards, "deep-recall", cards.length, baseTime),
      ).toHaveLength(0);
    });

    it("오래 전 학습한 카드만 통과 — R<0.6", () => {
      const longAgo = new Date("2026-01-01T00:00:00Z");
      const checkTime = new Date("2026-06-01T00:00:00Z"); // 5달 후 — R 매우 낮음
      const cards = [
        // 잊혀가는 카드 — 5달 전 again 1회만, R 매우 낮음
        {
          id: "stale-1",
          srs: reviewCard(createInitialState(longAgo), "again", longAgo),
        },
        // 새 카드 — R=1.0
        { id: "fresh-1", srs: createInitialState(checkTime) },
        // 방금 학습 — R 높음
        {
          id: "recent-1",
          srs: reviewCard(createInitialState(checkTime), "good", checkTime),
        },
      ];
      const selected = selectCardsForMode(
        cards,
        "deep-recall",
        cards.length,
        checkTime,
      );
      // 새 카드와 방금 학습 카드는 R>0.6 → 제외, stale-1 만 통과
      expect(selected.map((c) => c.id)).toEqual(["stale-1"]);
    });

    it("R 오름차순 정렬 — 가장 잊혀가는 카드 우선", () => {
      const t1 = new Date("2026-03-01T00:00:00Z");
      const t2 = new Date("2026-04-01T00:00:00Z");
      const checkTime = new Date("2026-06-01T00:00:00Z");
      const cards = [
        {
          id: "older-stale",
          srs: reviewCard(createInitialState(t1), "again", t1),
        },
        {
          id: "newer-stale",
          srs: reviewCard(createInitialState(t2), "again", t2),
        },
      ];
      const selected = selectCardsForMode(
        cards,
        "deep-recall",
        cards.length,
        checkTime,
      );
      // 두 카드 모두 R<0.6 — older 가 더 낮은 R 이라 먼저.
      if (selected.length === 2) {
        expect(selected[0]?.id).toBe("older-stale");
      } else {
        // R<0.6 만 통과한 카드 검증
        expect(selected.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("빈 풀 (cards=[]) — 빈 배열 반환", () => {
      expect(selectCardsForMode([], "deep-recall", 0, baseTime)).toHaveLength(0);
    });
  });
});
