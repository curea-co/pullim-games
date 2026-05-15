// content/index.ts 의 10 카드 — 자동 생성된 distractor 가 의미 있는지 자동 assert.
// plan 2026-05-14_factorization-discrimination §3 Phase 3.

import { describe, expect, it } from "vitest";
import { cards } from "./index";

describe("factorization content — distractor 의미성 (Phase 3)", () => {
  it("10 카드 모두 buildCard 성공 + schema 통과", () => {
    expect(cards.length).toBe(10);
    for (const card of cards) {
      expect(card.type).toBe("factorization-block");
      expect(card.problem.terms.length).toBeGreaterThanOrEqual(2);
      expect(card.problem.commonFactor.length).toBeGreaterThan(0);
      expect(card.problem.factoredForm.length).toBeGreaterThan(0);
    }
  });

  it("모든 카드 distractors 2개 + 정답과 다르고 서로 다름", () => {
    for (const card of cards) {
      const { commonFactor, distractors } = card.problem;
      expect(distractors, `card ${card.id} distractors`).toBeDefined();
      expect(distractors).toHaveLength(2);
      const [d1, d2] = distractors!;
      expect(d1, `card ${card.id} d1 !== commonFactor`).not.toBe(commonFactor);
      expect(d2, `card ${card.id} d2 !== commonFactor`).not.toBe(commonFactor);
      expect(d1, `card ${card.id} d1 !== d2`).not.toBe(d2);
      expect(d1, `card ${card.id} d1 !== "1"`).not.toBe("1");
      expect(d2, `card ${card.id} d2 !== "1"`).not.toBe("1");
      expect(d1.length, `card ${card.id} d1 non-empty`).toBeGreaterThan(0);
      expect(d2.length, `card ${card.id} d2 non-empty`).toBeGreaterThan(0);
    }
  });
});
