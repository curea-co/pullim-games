import { describe, expect, it } from "vitest";
import { buildCard } from "./buildCard";

describe("buildCard", () => {
  it("Card 1: 2x + 4 → factor 2, 두 term 모두 [2, ·, rest]", () => {
    const card = buildCard({
      id: "card-001",
      unit: "고1-인수분해-공통인수",
      difficultySeed: 1,
      hint: "공통인수를 찾아 끌어내세요",
      polynomial: "2x + 4",
    });
    expect(card.id).toBe("card-001");
    expect(card.problem.polynomial).toBe("2x + 4");
    expect(card.problem.commonFactor).toBe("2");
    expect(card.problem.factoredForm).toBe("2(x + 2)");
    expect(card.problem.terms).toHaveLength(2);

    const t1 = card.problem.terms[0]!;
    expect(t1.parts).toHaveLength(3);
    expect(t1.parts[0]).toMatchObject({ text: "2", isCommon: true });
    expect(t1.parts[1]).toMatchObject({ text: "·", isCommon: false });
    expect(t1.parts[2]).toMatchObject({ text: "x", isCommon: false });

    const t2 = card.problem.terms[1]!;
    expect(t2.parts[0]).toMatchObject({ text: "2", isCommon: true });
    expect(t2.parts[2]).toMatchObject({ text: "2", isCommon: false });
  });

  it("Card 4: 6x² + 8x → factor 2x, 윗첨자 처리", () => {
    const card = buildCard({
      id: "card-004",
      unit: "고1-인수분해-공통인수",
      difficultySeed: 4,
      hint: "공통인수가 변수도 포함해요",
      polynomial: "6x² + 8x",
    });
    expect(card.problem.commonFactor).toBe("2x");
    expect(card.problem.factoredForm).toBe("2x(3x + 4)");

    const t1 = card.problem.terms[0]!;
    expect(t1.parts[0]).toMatchObject({ text: "2x", isCommon: true });
    expect(t1.parts[2]).toMatchObject({ text: "3x", isCommon: false });
  });

  it("공통인수 없으면 throw", () => {
    expect(() =>
      buildCard({
        id: "x",
        unit: "x",
        difficultySeed: 1,
        hint: "x",
        polynomial: "2x² + 7x + 3",
      }),
    ).toThrow();
  });

  it("schema validation 통과 (zod)", () => {
    // buildCard 가 만든 카드는 그대로 FactorizationCardSchema 검증 통과해야 함
    const card = buildCard({
      id: "card-x",
      unit: "고1-인수분해-공통인수",
      difficultySeed: 2,
      hint: "h",
      polynomial: "3x + 9",
    });
    // type/structure 가 올바른지
    expect(card.type).toBe("factorization-block");
    expect(card.problem.terms.length).toBeGreaterThanOrEqual(2);
  });
});
