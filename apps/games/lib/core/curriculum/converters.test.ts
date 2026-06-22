import { describe, expect, it } from "vitest";
import {
  convertSeedToBlankDrafts,
  convertSeedToMultipleChoiceDrafts,
  convertSeedToTypingDrafts,
  convertSeedToWordMatchDrafts,
} from "./converters";
import { findSeed } from "./seed-loader";
import type { CurriculumSeed } from "./types";

const SAMPLE: CurriculumSeed = {
  subjectId: "math",
  subjectName: "수학",
  unitId: "factorization",
  unitName: "인수분해",
  vocabulary: [
    { term: "인수", meaning: "곱해진 식" },
    { term: "공통인수", meaning: "공통으로 들어 있는 인수" },
    { term: "완전제곱식", meaning: "어떤 식의 제곱" },
  ],
  pairs: [
    { left: "x²-1", right: "(x+1)(x-1)" },
    { left: "x²+2x+1", right: "(x+1)²" },
    { left: "x²-4", right: "(x+2)(x-2)" },
    { left: "x²+5x+6", right: "(x+2)(x+3)" },
    { left: "x²-9", right: "(x+3)(x-3)" },
    { left: "x²-25", right: "(x+5)(x-5)" },
    { left: "2x+4", right: "2(x+2)" },
  ],
  quizzes: [
    {
      question: "x²-9 의 인수분해는?",
      choices: ["(x+3)(x-3)", "(x-3)²", "(x+3)²", "x(x-9)"],
      correctIndex: 0,
      rationale: "차의 제곱 공식",
    },
  ],
  passages: [
    {
      passage: "차의 제곱 공식은 a²-b² = ___ 형태로 인수분해돼요.",
      answer: "(a+b)(a-b)",
      distractors: ["(a-b)²", "(a+b)²", "a(b-a)"],
      rationale: "공식 정의",
    },
  ],
};

describe("seed-loader", () => {
  it("findSeed 로 정확히 찾을 수 있다", () => {
    const seed = findSeed("math", "factorization");
    expect(seed).toBeDefined();
    expect(seed!.unitName).toBe("인수분해");
    expect(seed!.vocabulary.length).toBeGreaterThan(5);
  });

  it("존재하지 않는 키는 undefined", () => {
    expect(findSeed("none", "none")).toBeUndefined();
  });
});

describe("convertSeedToTypingDrafts", () => {
  it("vocabulary 에서 N 장 추출, kind=typing", () => {
    const drafts = convertSeedToTypingDrafts(SAMPLE, 2);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      kind: "typing",
      answer: "인수",
      meaning: "곱해진 식",
      difficulty: 3,
    });
  });

  it("count 가 vocabulary 보다 크면 가능한 만큼만", () => {
    const drafts = convertSeedToTypingDrafts(SAMPLE, 100);
    expect(drafts).toHaveLength(SAMPLE.vocabulary.length);
  });

  it("count=0 이면 빈 배열", () => {
    expect(convertSeedToTypingDrafts(SAMPLE, 0)).toHaveLength(0);
  });
});

describe("convertSeedToWordMatchDrafts", () => {
  it("5 짝씩 카드 1장 묶음", () => {
    const drafts = convertSeedToWordMatchDrafts(SAMPLE, 2);
    // SAMPLE.pairs = 7개 → [5, 2] → 잔여 2 < 4 → 직전과 합쳐 [7]
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.pairs).toHaveLength(7);
    expect(drafts[0]!.kind).toBe("word-match");
  });

  it("count=0 이면 빈 배열", () => {
    expect(convertSeedToWordMatchDrafts(SAMPLE, 0)).toHaveLength(0);
  });
});

describe("convertSeedToMultipleChoiceDrafts", () => {
  it("quizzes 에서 N 장 추출, choices 4 + correctIndex 보존", () => {
    const drafts = convertSeedToMultipleChoiceDrafts(SAMPLE, 1);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      kind: "multiple-choice",
      choices: ["(x+3)(x-3)", "(x-3)²", "(x+3)²", "x(x-9)"],
      correctIndex: 0,
      hint: "차의 제곱 공식",
    });
  });
});

describe("convertSeedToBlankDrafts", () => {
  it("passages 에서 N 장, choices=[answer, ...distractors], correctIndex=0", () => {
    const drafts = convertSeedToBlankDrafts(SAMPLE, 1);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.passage).toContain("___");
    expect(drafts[0]!.choices).toHaveLength(4);
    expect(drafts[0]!.choices[0]).toBe("(a+b)(a-b)");
    expect(drafts[0]!.correctIndex).toBe(0);
    expect(drafts[0]!.rationale).toBe("공식 정의");
  });

  it("___ 가 passage 에 없으면 끝에 추가 (안전망)", () => {
    const seedNoToken: CurriculumSeed = {
      ...SAMPLE,
      passages: [
        {
          passage: "차의 제곱 공식.",
          answer: "(a+b)(a-b)",
          distractors: ["x", "y", "z"],
        },
      ],
    };
    const drafts = convertSeedToBlankDrafts(seedNoToken, 1);
    expect(drafts[0]!.passage).toContain("___");
  });
});
