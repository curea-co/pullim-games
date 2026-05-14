// 이미지 핫스팟 카드 풀 — V0: 식물 구조 5장.
// 도식 SVG (PlantDiagram.tsx) 기준 좌표 — bbox 는 0~100 % (viewBox 200x200 기준).
// 카드 풀에 distractor 1개 포함 → 끼워맞추기 회피.

import { ImageHotspotCardSchema } from "../schema";
import type { ImageHotspotCard } from "../schema";

const RAW_CARDS: ImageHotspotCard[] = [
  // Card 1 — 꽃 (난이도 1, 4 region)
  {
    id: "card-001",
    type: "image-hotspot",
    unit: "고1-과학-식물-꽃",
    difficultySeed: 1,
    hint: "암술은 중앙, 수술은 둘레, 꽃잎은 화려한 부분, 꽃받침은 아래.",
    problem: {
      diagramId: "flower",
      regions: [
        {
          id: "r-petal",
          bbox: { x: 38, y: 8, width: 24, height: 22 },
          correctCardId: "c-petal",
        },
        {
          id: "r-pistil",
          bbox: { x: 44, y: 43, width: 12, height: 14 },
          correctCardId: "c-pistil",
        },
        {
          id: "r-stamen",
          bbox: { x: 62, y: 44, width: 14, height: 14 },
          correctCardId: "c-stamen",
        },
        {
          id: "r-sepal",
          bbox: { x: 38, y: 78, width: 24, height: 14 },
          correctCardId: "c-sepal",
        },
      ],
      cards: [
        { id: "c-petal", text: "꽃잎" },
        { id: "c-pistil", text: "암술" },
        { id: "c-stamen", text: "수술" },
        { id: "c-sepal", text: "꽃받침" },
        { id: "c-leaf", text: "잎" }, // distractor
      ],
    },
  },
  // Card 2 — 잎 (난이도 2, 3 region)
  {
    id: "card-002",
    type: "image-hotspot",
    unit: "고1-과학-식물-잎",
    difficultySeed: 2,
    hint: "잎몸은 넓은 면, 잎맥은 가는 선, 잎자루는 줄기에 붙는 부분.",
    problem: {
      diagramId: "leaf",
      regions: [
        {
          id: "r-blade",
          bbox: { x: 22, y: 20, width: 22, height: 50 },
          correctCardId: "c-blade",
        },
        {
          id: "r-vein",
          bbox: { x: 46, y: 20, width: 8, height: 50 },
          correctCardId: "c-vein",
        },
        {
          id: "r-petiole",
          bbox: { x: 42, y: 80, width: 16, height: 18 },
          correctCardId: "c-petiole",
        },
      ],
      cards: [
        { id: "c-blade", text: "잎몸" },
        { id: "c-vein", text: "잎맥" },
        { id: "c-petiole", text: "잎자루" },
        { id: "c-root", text: "뿌리" }, // distractor
      ],
    },
  },
  // Card 3 — 뿌리 (난이도 3, 4 region)
  {
    id: "card-003",
    type: "image-hotspot",
    unit: "고1-과학-식물-뿌리",
    difficultySeed: 3,
    hint: "원뿌리는 중앙 굵게, 곁뿌리는 좌우 가지, 뿌리털은 가장 끝 가닥.",
    problem: {
      diagramId: "root",
      regions: [
        {
          id: "r-stem-top",
          bbox: { x: 42, y: 2, width: 16, height: 24 },
          correctCardId: "c-stem",
        },
        {
          id: "r-main",
          bbox: { x: 46, y: 28, width: 8, height: 50 },
          correctCardId: "c-main-root",
        },
        {
          id: "r-lateral",
          bbox: { x: 20, y: 50, width: 22, height: 26 },
          correctCardId: "c-lateral-root",
        },
        {
          id: "r-hair",
          bbox: { x: 42, y: 82, width: 16, height: 16 },
          correctCardId: "c-hair",
        },
      ],
      cards: [
        { id: "c-stem", text: "줄기" },
        { id: "c-main-root", text: "원뿌리" },
        { id: "c-lateral-root", text: "곁뿌리" },
        { id: "c-hair", text: "뿌리털" },
        { id: "c-petal", text: "꽃잎" }, // distractor
      ],
    },
  },
  // Card 4 — 줄기 단면 (난이도 4, 4 region — 동심원)
  {
    id: "card-004",
    type: "image-hotspot",
    unit: "고1-과학-식물-줄기-단면",
    difficultySeed: 4,
    hint: "바깥부터 외피 → 형성층 → 물관 → 체관 순으로 동심원.",
    problem: {
      diagramId: "stem",
      regions: [
        {
          id: "r-outer",
          bbox: { x: 5, y: 42, width: 12, height: 16 },
          correctCardId: "c-bark",
        },
        {
          id: "r-cambium",
          bbox: { x: 22, y: 42, width: 10, height: 16 },
          correctCardId: "c-cambium",
        },
        {
          id: "r-xylem",
          bbox: { x: 34, y: 42, width: 8, height: 16 },
          correctCardId: "c-xylem",
        },
        {
          id: "r-phloem",
          bbox: { x: 43, y: 43, width: 14, height: 14 },
          correctCardId: "c-phloem",
        },
      ],
      cards: [
        { id: "c-bark", text: "외피" },
        { id: "c-cambium", text: "형성층" },
        { id: "c-xylem", text: "물관" },
        { id: "c-phloem", text: "체관" },
        { id: "c-root", text: "뿌리" }, // distractor
      ],
    },
  },
  // Card 5 — 씨앗 (난이도 5, 3 region)
  {
    id: "card-005",
    type: "image-hotspot",
    unit: "고1-과학-식물-씨앗",
    difficultySeed: 5,
    hint: "종피는 바깥 껍질, 떡잎은 안쪽 양분 저장 부위, 배는 중앙 작은 점(자라날 부분).",
    problem: {
      diagramId: "seed",
      regions: [
        {
          id: "r-coat",
          bbox: { x: 4, y: 46, width: 14, height: 14 },
          correctCardId: "c-coat",
        },
        {
          id: "r-cotyledon",
          bbox: { x: 24, y: 45, width: 18, height: 16 },
          correctCardId: "c-cotyledon",
        },
        {
          id: "r-embryo",
          bbox: { x: 43, y: 43, width: 14, height: 14 },
          correctCardId: "c-embryo",
        },
      ],
      cards: [
        { id: "c-coat", text: "종피" },
        { id: "c-cotyledon", text: "떡잎" },
        { id: "c-embryo", text: "배" },
        { id: "c-stamen", text: "수술" }, // distractor
      ],
    },
  },
];

export const cards: ImageHotspotCard[] = RAW_CARDS.map((raw, i) => {
  const result = ImageHotspotCardSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `[image-hotspot] card ${i} schema invalid: ${result.error.message}`,
    );
  }
  return result.data;
});

export function getCardById(id: string): ImageHotspotCard | undefined {
  return cards.find((c) => c.id === id);
}

export function getCardSequence(): ImageHotspotCard[] {
  return [...cards];
}
