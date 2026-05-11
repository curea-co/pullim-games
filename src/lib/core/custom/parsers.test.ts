import { describe, it, expect } from "vitest";
import {
  parseTypingSource,
  parseMatchingSource,
  parseMultipleChoiceSource,
  parseBlankSource,
} from "./parsers";

describe("parseTypingSource", () => {
  it("정상 — 한 줄에 정답::뜻", () => {
    const r = parseTypingSource("모순::앞뒤가 안 맞음\n일거양득::두 가지 이익");
    expect(r.errors).toEqual([]);
    expect(r.cards).toHaveLength(2);
    expect(r.cards[0]).toMatchObject({
      kind: "typing",
      answer: "모순",
      meaning: "앞뒤가 안 맞음",
    });
  });
  it("TAB 구분 지원", () => {
    const r = parseTypingSource("모순\t앞뒤가 안 맞음");
    expect(r.errors).toEqual([]);
    expect(r.cards[0]?.answer).toBe("모순");
  });
  it("3 컬럼 = 한자 표기", () => {
    const r = parseTypingSource("모순::앞뒤가 안 맞음::矛盾");
    expect(r.cards[0]?.pronunciation).toBe("矛盾");
  });
  it("형식 오류 → errors", () => {
    const r = parseTypingSource("그냥한줄");
    expect(r.cards).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.line).toBe(1);
  });
  it("빈 줄 무시", () => {
    const r = parseTypingSource("\n\n모순::뜻\n\n");
    expect(r.cards).toHaveLength(1);
    expect(r.errors).toEqual([]);
  });
});

describe("parseMatchingSource", () => {
  const five = [
    "pursue::추구하다",
    "contradict::모순되다",
    "perceive::인식하다",
    "distinguish::구별하다",
    "regulate::조절하다",
  ].join("\n");

  it("5 짝 = 카드 1장", () => {
    const r = parseMatchingSource(five);
    expect(r.errors).toEqual([]);
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]?.pairs).toHaveLength(5);
  });
  it("10 짝 = 카드 2장", () => {
    const ten = [
      five,
      "integrity::진실성",
      "prejudice::편견",
      "dilemma::딜레마",
      "consensus::합의",
      "perspective::관점",
    ].join("\n");
    const r = parseMatchingSource(ten);
    expect(r.cards).toHaveLength(2);
    expect(r.cards[0]?.pairs).toHaveLength(5);
    expect(r.cards[1]?.pairs).toHaveLength(5);
  });
  it("13 짝 = 5+5 → 잔여 3 합쳐서 5+8 (최대 8)", () => {
    const lines: string[] = [];
    for (let i = 0; i < 13; i += 1) lines.push(`a${i}::b${i}`);
    const r = parseMatchingSource(lines.join("\n"));
    expect(r.cards.map((c) => c.pairs.length)).toEqual([5, 8]);
  });
  it("3 짝만 = 부족 오류", () => {
    const r = parseMatchingSource("a::1\nb::2\nc::3");
    expect(r.cards).toHaveLength(0);
    expect(r.errors[0]?.message).toContain("최소 4");
  });
});

describe("parseMultipleChoiceSource", () => {
  const block = `Q: 2x + 4 의 인수분해는?
A) x(2 + 4)
B) 2(x + 2)
C) 2x + 4
D) (x+2)(x-2)
정답: B`;

  it("정상 블록 1개", () => {
    const r = parseMultipleChoiceSource(block);
    expect(r.errors).toEqual([]);
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]).toMatchObject({
      question: "2x + 4 의 인수분해는?",
      choices: ["x(2 + 4)", "2(x + 2)", "2x + 4", "(x+2)(x-2)"],
      correctIndex: 1,
    });
  });
  it("두 블록 빈 줄 분리", () => {
    const second = `Q: x² + 5x + 6 ?
A) (x+2)(x+3)
B) (x+1)(x+6)
C) (x-2)(x-3)
D) x(x+5)+6
정답: A`;
    const r = parseMultipleChoiceSource(`${block}\n\n${second}`);
    expect(r.cards).toHaveLength(2);
    expect(r.cards[1]?.correctIndex).toBe(0);
  });
  it("정답 누락 → 오류", () => {
    const noAns = block.replace("정답: B", "");
    const r = parseMultipleChoiceSource(noAns);
    expect(r.cards).toHaveLength(0);
    expect(r.errors[0]?.message).toContain("정답");
  });
  it("보기 부족 → 오류", () => {
    const short = `Q: ?
A) one
B) two
정답: A`;
    const r = parseMultipleChoiceSource(short);
    expect(r.cards).toHaveLength(0);
    expect(r.errors[0]?.message).toContain("보기 4개");
  });
});

describe("parseBlankSource", () => {
  const block = `Reading widely improves your vocabulary. The more you read, the more new words you [encounter|ignore|remember|copy], often without noticing.`;

  it("정상 블록 1개 — passage ___ 변환", () => {
    const r = parseBlankSource(block);
    expect(r.errors).toEqual([]);
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]?.passage).toContain("___");
    expect(r.cards[0]?.passage).not.toContain("[encounter");
    expect(r.cards[0]?.choices).toEqual([
      "encounter",
      "ignore",
      "remember",
      "copy",
    ]);
    expect(r.cards[0]?.correctIndex).toBe(0);
  });
  it("해설 라인 추출", () => {
    const withRationale = `${block}\n해설: encounter = 마주치다`;
    const r = parseBlankSource(withRationale);
    expect(r.cards[0]?.rationale).toBe("encounter = 마주치다");
    expect(r.cards[0]?.passage).not.toContain("해설");
  });
  it("마커 누락 → 오류", () => {
    const noMarker = `Reading widely improves your vocabulary.`;
    const r = parseBlankSource(noMarker);
    expect(r.cards).toHaveLength(0);
    expect(r.errors[0]?.message).toContain("마커");
  });
  it("보기 부족 → 오류", () => {
    const fewer = `Reading [a|b|c]`;
    const r = parseBlankSource(fewer);
    expect(r.cards).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
  });
  it("두 블록 빈 줄 분리", () => {
    const second = `Many scientists once believed that emotions were [opposed|related|similar|identical] to logical thinking.`;
    const r = parseBlankSource(`${block}\n\n${second}`);
    expect(r.cards).toHaveLength(2);
  });
});
