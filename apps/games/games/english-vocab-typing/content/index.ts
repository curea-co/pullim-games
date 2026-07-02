// english-vocab-typing 카드 풀 — 5장, 고1 빈출 영어 어휘.
// KNOWN-TRADE-OFF: proc/plan/2026-06-30_target-middle-to-high1.md §6.6 — 어휘 난도는 고1 상단(수능 연계)이나,
//   영어는 과학과 달리 교과 고정 어휘 리스트가 없어 학술어가 고1 reading 에서 도달 가능(spec/02 §2.4·spec/05 §5.1).
//   콘텐츠 교체 대신 라벨=고1 유지, 사용자 합의 2026-07-02 (Codex #133 R4).

import { EnglishVocabTypingCardSchema } from "../schema";
import type { EnglishVocabTypingCard } from "../schema";

const RAW_CARDS: EnglishVocabTypingCard[] = [
  {
    id: "evt-001",
    type: "english-vocab-typing",
    unit: "고1-영어-어휘",
    difficultySeed: 1,
    hint: "7글자 동사, a- 로 시작",
    problem: {
      meaning: "성취하다, 이루다",
      answer: "achieve",
      pronunciation: "/əˈtʃiːv/",
    },
  },
  {
    id: "evt-002",
    type: "english-vocab-typing",
    unit: "고1-영어-어휘",
    difficultySeed: 2,
    hint: "11글자 명사, en- 로 시작",
    problem: {
      meaning: "환경, 주위 상황",
      answer: "environment",
      pronunciation: "/ɪnˈvaɪrənmənt/",
    },
  },
  {
    id: "evt-003",
    type: "english-vocab-typing",
    unit: "고1-영어-어휘",
    difficultySeed: 2,
    hint: "7글자 동사, an- 로 시작",
    problem: {
      meaning: "분석하다",
      answer: "analyze",
      pronunciation: "/ˈænəlaɪz/",
    },
  },
  {
    id: "evt-004",
    type: "english-vocab-typing",
    unit: "고1-영어-어휘",
    difficultySeed: 3,
    hint: "11글자 명사, con- 로 시작",
    problem: {
      meaning: "결과, 결말",
      answer: "consequence",
      pronunciation: "/ˈkɑːnsɪkwens/",
    },
  },
  {
    id: "evt-005",
    type: "english-vocab-typing",
    unit: "고1-영어-어휘",
    difficultySeed: 3,
    hint: "13글자 형용사, in- 부정 접두사",
    problem: {
      meaning: "필수적인, 없어서는 안 될",
      answer: "indispensable",
      pronunciation: "/ˌɪndɪˈspensəbl/",
    },
  },
];

export const cards: EnglishVocabTypingCard[] = RAW_CARDS.map((raw, i) => {
  const r = EnglishVocabTypingCardSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[english-vocab-typing] card ${i} schema invalid: ${r.error.message}`,
    );
  }
  return r.data;
});

export function getCardSequence(): EnglishVocabTypingCard[] {
  return [...cards];
}
