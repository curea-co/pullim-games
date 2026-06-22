// 생물 분류 카드 풀 — V0: 5장. 난이도 1→5.
// 모두 생명과학 (D3 채택). 카테고리 max 4 (D5 채택). 윤리·사회는 V1+ 별 게임.

import { BioTaxonomyCardSchema } from "../schema";
import type { BioTaxonomyCard } from "../schema";

const RAW_CARDS: BioTaxonomyCard[] = [
  {
    id: "card-001",
    type: "bio-taxonomy",
    unit: "고1-생명과학-진핵·원핵",
    difficultySeed: 1,
    hint: "핵막의 유무로 가릅니다",
    problem: {
      title: "진핵 vs 원핵으로 나눠요",
      categories: [
        { id: "eukaryote", label: "진핵생물" },
        { id: "prokaryote", label: "원핵생물" },
      ],
      items: [
        { id: "i1", label: "사람", categoryId: "eukaryote" },
        { id: "i2", label: "효모", categoryId: "eukaryote" },
        { id: "i3", label: "짚신벌레", categoryId: "eukaryote" },
        { id: "i4", label: "대장균", categoryId: "prokaryote" },
        { id: "i5", label: "결핵균", categoryId: "prokaryote" },
        { id: "i6", label: "남세균", categoryId: "prokaryote" },
      ],
    },
  },
  {
    id: "card-002",
    type: "bio-taxonomy",
    unit: "고1-생명과학-3계",
    difficultySeed: 2,
    hint: "광합성, 균사, 운동성을 떠올려보세요",
    problem: {
      title: "동물·식물·균류로 나눠요",
      categories: [
        { id: "animal", label: "동물" },
        { id: "plant", label: "식물" },
        { id: "fungus", label: "균류" },
      ],
      items: [
        { id: "i1", label: "호랑이", categoryId: "animal" },
        { id: "i2", label: "개구리", categoryId: "animal" },
        { id: "i3", label: "소나무", categoryId: "plant" },
        { id: "i4", label: "옥수수", categoryId: "plant" },
        { id: "i5", label: "송이버섯", categoryId: "fungus" },
        { id: "i6", label: "푸른곰팡이", categoryId: "fungus" },
      ],
    },
  },
  {
    id: "card-003",
    type: "bio-taxonomy",
    unit: "고1-생명과학-척추·무척추",
    difficultySeed: 3,
    hint: "등뼈가 있느냐 없느냐",
    problem: {
      title: "척추동물 vs 무척추동물",
      categories: [
        { id: "vertebrate", label: "척추동물" },
        { id: "invertebrate", label: "무척추동물" },
      ],
      items: [
        { id: "i1", label: "잉어", categoryId: "vertebrate" },
        { id: "i2", label: "개구리", categoryId: "vertebrate" },
        { id: "i3", label: "참새", categoryId: "vertebrate" },
        { id: "i4", label: "지렁이", categoryId: "invertebrate" },
        { id: "i5", label: "메뚜기", categoryId: "invertebrate" },
        { id: "i6", label: "해파리", categoryId: "invertebrate" },
      ],
    },
  },
  {
    id: "card-004",
    type: "bio-taxonomy",
    unit: "고1-생명과학-식물-분류",
    difficultySeed: 4,
    hint: "관다발, 종자, 씨방 여부를 떠올려보세요",
    problem: {
      title: "식물을 4가지로 분류해요",
      categories: [
        { id: "bryo", label: "선태식물" },
        { id: "fern", label: "양치식물" },
        { id: "gymno", label: "겉씨식물" },
        { id: "angio", label: "속씨식물" },
      ],
      items: [
        { id: "i1", label: "우산이끼", categoryId: "bryo" },
        { id: "i2", label: "솔이끼", categoryId: "bryo" },
        { id: "i3", label: "고사리", categoryId: "fern" },
        { id: "i4", label: "쇠뜨기", categoryId: "fern" },
        { id: "i5", label: "소나무", categoryId: "gymno" },
        { id: "i6", label: "잣나무", categoryId: "gymno" },
        { id: "i7", label: "벼", categoryId: "angio" },
        { id: "i8", label: "진달래", categoryId: "angio" },
      ],
    },
  },
  {
    id: "card-005",
    type: "bio-taxonomy",
    unit: "고1-생명과학-척추동물-4강",
    difficultySeed: 5,
    hint: "비늘·외피·체온조절 방식을 떠올려보세요 (양서류는 V1+)",
    problem: {
      title: "척추동물을 4가지로 나눠요",
      categories: [
        { id: "fish", label: "어류" },
        { id: "reptile", label: "파충류" },
        { id: "bird", label: "조류" },
        { id: "mammal", label: "포유류" },
      ],
      items: [
        { id: "i1", label: "잉어", categoryId: "fish" },
        { id: "i2", label: "상어", categoryId: "fish" },
        { id: "i3", label: "거북", categoryId: "reptile" },
        { id: "i4", label: "도마뱀", categoryId: "reptile" },
        { id: "i5", label: "참새", categoryId: "bird" },
        { id: "i6", label: "부엉이", categoryId: "bird" },
        { id: "i7", label: "사람", categoryId: "mammal" },
        { id: "i8", label: "박쥐", categoryId: "mammal" },
      ],
    },
  },
];

// 런타임 검증
export const cards: BioTaxonomyCard[] = RAW_CARDS.map((raw, i) => {
  const result = BioTaxonomyCardSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[bio-taxonomy] card ${i} schema invalid: ${result.error.message}`,
    );
  }
  return result.data;
});

export function getCardById(id: string): BioTaxonomyCard | undefined {
  return cards.find((c) => c.id === id);
}

export function getCardSequence(): BioTaxonomyCard[] {
  return [...cards];
}
