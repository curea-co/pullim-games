// history-timeline 카드 풀 — 5장, 한국 근현대사 시기별 사건 정렬.

import { TimelineCardSchema } from "../schema";
import type { TimelineCard } from "../schema";

const RAW_CARDS: TimelineCard[] = [
  {
    id: "ht-001",
    type: "timeline",
    unit: "고2-한국사-개항기",
    difficultySeed: 2,
    hint: "대원군 하야 후 개항부터",
    problem: {
      era: "개항기 (1876~1894)",
      events: [
        { title: "강화도조약", year: 1876 },
        { title: "임오군란", year: 1882 },
        { title: "갑신정변", year: 1884 },
        { title: "동학농민운동", year: 1894 },
        { title: "갑오개혁", year: 1894 },
      ],
    },
  },
  {
    id: "ht-002",
    type: "timeline",
    unit: "고2-한국사-대한제국",
    difficultySeed: 3,
    hint: "고종의 황제 즉위부터 한일병합까지",
    problem: {
      era: "대한제국 ~ 국권피탈 (1897~1910)",
      events: [
        { title: "대한제국 선포", year: 1897 },
        { title: "을사늑약", year: 1905 },
        { title: "헤이그 특사", year: 1907 },
        { title: "정미의병", year: 1907 },
        { title: "한일병합", year: 1910 },
      ],
    },
  },
  {
    id: "ht-003",
    type: "timeline",
    unit: "고2-한국사-1910년대",
    difficultySeed: 3,
    hint: "무단통치 → 3·1 운동 → 임정",
    problem: {
      era: "1910년대 무단통치",
      events: [
        { title: "한일병합", year: 1910 },
        { title: "토지조사사업 시작", year: 1910 },
        { title: "105인 사건", year: 1911 },
        { title: "3·1 운동", year: 1919 },
        { title: "대한민국 임시정부 수립", year: 1919 },
      ],
    },
  },
  {
    id: "ht-004",
    type: "timeline",
    unit: "고2-한국사-1920년대",
    difficultySeed: 4,
    hint: "산미증식 → 학생운동 → 의거",
    problem: {
      era: "1920년대 문화통치",
      events: [
        { title: "산미증식계획 시작", year: 1920 },
        { title: "6·10 만세운동", year: 1926 },
        { title: "신간회 결성", year: 1927 },
        { title: "광주학생항일운동", year: 1929 },
        { title: "윤봉길 의거", year: 1932 },
      ],
    },
  },
  {
    id: "ht-005",
    type: "timeline",
    unit: "고2-한국사-광복정부수립",
    difficultySeed: 4,
    hint: "광복 → 신탁통치 논쟁 → 단독선거",
    problem: {
      era: "광복 ~ 정부수립 (1945~1948)",
      events: [
        { title: "광복", year: 1945 },
        { title: "모스크바 3상회의", year: 1945 },
        { title: "1차 미소공동위원회", year: 1946 },
        { title: "5·10 총선거", year: 1948 },
        { title: "대한민국 정부수립", year: 1948 },
      ],
    },
  },
];

export const cards: TimelineCard[] = RAW_CARDS.map((raw, i) => {
  const r = TimelineCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[history-timeline] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): TimelineCard[] {
  return [...cards];
}
