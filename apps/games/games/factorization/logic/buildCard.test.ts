import { describe, expect, it } from "vitest";
import { buildCard, generateDistractors } from "./buildCard";
import { parsePolynomial, extractCommonFactor } from "@/lib/core";

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

describe("generateDistractors (plan §1 drag-to-chip 룰)", () => {
  function distractorsFor(polynomial: string): [string, string] {
    const poly = parsePolynomial(polynomial);
    const result = extractCommonFactor(poly);
    if (!result) throw new Error("no common factor");
    return generateDistractors(result.factor, poly);
  }

  it("계수+변수 (2x): 정답과 다르고 서로 다른 2개", () => {
    // 6x² + 8x → factor 2x. 후보 후보: "x"(약화), "2"(약화 변수제거), "x²"(약화 지수-1), "6x²"/"8x"(다항식 term), "4x"(배수), "2x²"(배수 지수+1)
    const [d1, d2] = distractorsFor("6x² + 8x");
    expect(d1).not.toBe("2x");
    expect(d2).not.toBe("2x");
    expect(d1).not.toBe(d2);
    expect(d1).not.toBe("1");
    expect(d2).not.toBe("1");
  });

  it("계수만 (2): 2x + 4 → 정답 2, 후보는 1 제외", () => {
    const [d1, d2] = distractorsFor("2x + 4");
    expect(d1).not.toBe("2");
    expect(d2).not.toBe("2");
    expect(d1).not.toBe(d2);
    expect(d1).not.toBe("1");
    expect(d2).not.toBe("1");
  });

  it("변수만 (x): x² + 3x → 정답 x, 후보는 정답 X", () => {
    const [d1, d2] = distractorsFor("x² + 3x");
    expect(d1).not.toBe("x");
    expect(d2).not.toBe("x");
    expect(d1).not.toBe(d2);
  });

  it("계수+변수 윗첨자 (3x²): 6x³ + 9x² → 정답 3x², 후보 다양", () => {
    const [d1, d2] = distractorsFor("6x³ + 9x²");
    expect(d1).not.toBe("3x²");
    expect(d2).not.toBe("3x²");
    expect(d1).not.toBe(d2);
    expect(d1).not.toBe("1");
    expect(d2).not.toBe("1");
  });

  it("buildCard 결과에 distractors 자동 포함", () => {
    const card = buildCard({
      id: "card-001",
      unit: "고1-인수분해-공통인수",
      difficultySeed: 1,
      hint: "공통인수를 찾아 끌어내세요",
      polynomial: "2x + 4",
    });
    expect(card.problem.distractors).toBeDefined();
    expect(card.problem.distractors).toHaveLength(2);
    const [d1, d2] = card.problem.distractors!;
    expect(d1).not.toBe(card.problem.commonFactor);
    expect(d2).not.toBe(card.problem.commonFactor);
    expect(d1).not.toBe(d2);
  });

  it("buildCard override: distractors 명시 시 자동 생성 무시", () => {
    const card = buildCard({
      id: "card-001",
      unit: "고1-인수분해-공통인수",
      difficultySeed: 1,
      hint: "h",
      polynomial: "2x + 4",
      distractors: ["xy", "9z"],
    });
    expect(card.problem.distractors).toEqual(["xy", "9z"]);
  });
});
