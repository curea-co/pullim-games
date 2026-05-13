// 한국어 품사 태깅 카드 풀 — V0: 5장. 난이도 1→5.
// 토큰 = 형태소 단위. 어절을 띄어쓰기 단위가 아닌 형태소(체언+조사 분리) 로 쪼갬.

import { KoreanPosTaggingCardSchema } from "../schema";
import type { KoreanPosTaggingCard } from "../schema";

const RAW_CARDS: KoreanPosTaggingCard[] = [
  {
    id: "card-001",
    type: "korean-pos-tagging",
    unit: "고1-국어-품사-단문",
    difficultySeed: 1,
    hint: "체언과 조사를 따로 분리해서 칠해요",
    problem: {
      sentence: "고양이가 꽃을 본다",
      tokens: [
        { id: "t1", text: "고양이", pos: "명사" },
        { id: "t2", text: "가", pos: "조사" },
        { id: "t3", text: "꽃", pos: "명사" },
        { id: "t4", text: "을", pos: "조사" },
        { id: "t5", text: "본다", pos: "동사" },
      ],
    },
  },
  {
    id: "card-002",
    type: "korean-pos-tagging",
    unit: "고1-국어-품사-형용사·부사",
    difficultySeed: 2,
    hint: "형용사는 상태·성질, 부사는 용언을 꾸며요",
    problem: {
      sentence: "하늘이 매우 푸르다",
      tokens: [
        { id: "t1", text: "하늘", pos: "명사" },
        { id: "t2", text: "이", pos: "조사" },
        { id: "t3", text: "매우", pos: "부사" },
        { id: "t4", text: "푸르다", pos: "형용사" },
      ],
    },
  },
  {
    id: "card-003",
    type: "korean-pos-tagging",
    unit: "고1-국어-품사-관형사",
    difficultySeed: 3,
    hint: "관형사는 체언을 꾸며요 (예: 새, 헌, 그, 이)",
    problem: {
      sentence: "그 새 책을 골랐다",
      tokens: [
        { id: "t1", text: "그", pos: "관형사" },
        { id: "t2", text: "새", pos: "관형사" },
        { id: "t3", text: "책", pos: "명사" },
        { id: "t4", text: "을", pos: "조사" },
        { id: "t5", text: "골랐다", pos: "동사" },
      ],
    },
  },
  {
    id: "card-004",
    type: "korean-pos-tagging",
    unit: "고1-국어-품사-대명사",
    difficultySeed: 4,
    hint: "대명사는 사람·사물을 대신 가리켜요 (예: 나, 너, 그, 이것)",
    problem: {
      sentence: "나는 빨리 학교에 간다",
      tokens: [
        { id: "t1", text: "나", pos: "대명사" },
        { id: "t2", text: "는", pos: "조사" },
        { id: "t3", text: "빨리", pos: "부사" },
        { id: "t4", text: "학교", pos: "명사" },
        { id: "t5", text: "에", pos: "조사" },
        { id: "t6", text: "간다", pos: "동사" },
      ],
    },
  },
  {
    id: "card-005",
    type: "korean-pos-tagging",
    unit: "고1-국어-품사-종합",
    difficultySeed: 5,
    hint: "관형사·형용사·부사 모두 등장 — 각자 무엇을 꾸미는지 보세요",
    problem: {
      sentence: "그는 그 작은 새를 멋지게 그렸다",
      tokens: [
        { id: "t1", text: "그", pos: "대명사" },
        { id: "t2", text: "는", pos: "조사" },
        { id: "t3", text: "그", pos: "관형사" },
        { id: "t4", text: "작은", pos: "형용사" },
        { id: "t5", text: "새", pos: "명사" },
        { id: "t6", text: "를", pos: "조사" },
        { id: "t7", text: "멋지게", pos: "부사" },
        { id: "t8", text: "그렸다", pos: "동사" },
      ],
    },
  },
];

// 런타임 검증
export const cards: KoreanPosTaggingCard[] = RAW_CARDS.map((raw, i) => {
  const result = KoreanPosTaggingCardSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[korean-pos-tagging] card ${i} schema invalid: ${result.error.message}`,
    );
  }
  return result.data;
});

export function getCardById(id: string): KoreanPosTaggingCard | undefined {
  return cards.find((c) => c.id === id);
}

export function getCardSequence(): KoreanPosTaggingCard[] {
  return [...cards];
}
