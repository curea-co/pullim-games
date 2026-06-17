// Seed → DraftCard 변환기. 게임 타입별 4 함수.
// 순수 함수, 외부 의존성 없음, side-effect 없음.
// `2026-05-08_management-auto-generation.md` §3.1 따름.

import type {
  BlankDraft,
  MultipleChoiceDraft,
  TypingDraft,
  WordMatchDraft,
} from "../custom/types";
import type { CurriculumSeed } from "./types";

const DEFAULT_DIFFICULTY = 3;

const PAIRS_PER_CARD = 5;
const PAIRS_MIN = 4;
const PAIRS_MAX = 8;

const BLANK_TOKEN = "___";

/** 어휘 → typing 카드. 0 < count <= vocabulary.length 만큼 자른다. */
export function convertSeedToTypingDrafts(
  seed: CurriculumSeed,
  count: number,
): TypingDraft[] {
  const slice = seed.vocabulary.slice(0, Math.max(0, count));
  return slice.map((v) => ({
    kind: "typing",
    difficulty: DEFAULT_DIFFICULTY,
    answer: v.term,
    meaning: v.meaning,
    pronunciation: v.pronunciation,
  }));
}

/** 짝 리스트 → word-match 카드 (5 짝씩 묶음). count 는 카드 수, 짝 수가 아님. */
export function convertSeedToWordMatchDrafts(
  seed: CurriculumSeed,
  count: number,
): WordMatchDraft[] {
  const cards: WordMatchDraft[] = [];
  const allPairs = seed.pairs;
  const targetCards = Math.max(0, count);

  for (let i = 0; i < allPairs.length; i += PAIRS_PER_CARD) {
    if (cards.length >= targetCards) break;
    const chunk = allPairs.slice(i, i + PAIRS_PER_CARD);
    if (
      chunk.length < PAIRS_MIN &&
      cards.length > 0 &&
      cards[cards.length - 1]!.pairs.length + chunk.length <= PAIRS_MAX
    ) {
      cards[cards.length - 1]!.pairs.push(...chunk);
      continue;
    }
    if (chunk.length < PAIRS_MIN) {
      // 잔여가 4 미만이고 합칠 곳도 없음 — 버림
      continue;
    }
    cards.push({
      kind: "word-match",
      difficulty: DEFAULT_DIFFICULTY,
      pairs: chunk,
    });
  }
  return cards;
}

/** 객관식 → multiple-choice 카드. 0 < count <= quizzes.length. */
export function convertSeedToMultipleChoiceDrafts(
  seed: CurriculumSeed,
  count: number,
): MultipleChoiceDraft[] {
  const slice = seed.quizzes.slice(0, Math.max(0, count));
  return slice.map((q) => ({
    kind: "multiple-choice",
    difficulty: DEFAULT_DIFFICULTY,
    question: q.question,
    choices: q.choices,
    correctIndex: q.correctIndex,
    hint: q.rationale,
  }));
}

/** 빈칸 지문 → blank 카드. ___ 자리에 정답 들어감. choices=[answer, ...distractors], correctIndex=0. */
export function convertSeedToBlankDrafts(
  seed: CurriculumSeed,
  count: number,
): BlankDraft[] {
  const slice = seed.passages.slice(0, Math.max(0, count));
  return slice.map((p) => {
    // passage 에 ___ 가 없으면 추가 (명세상 항상 있어야 하지만 안전망)
    const passage = p.passage.includes(BLANK_TOKEN)
      ? p.passage
      : `${p.passage} ${BLANK_TOKEN}`;
    const choices = [p.answer, ...p.distractors].slice(0, 4);
    return {
      kind: "blank",
      difficulty: DEFAULT_DIFFICULTY,
      passage,
      choices,
      correctIndex: 0,
      rationale: p.rationale,
    };
  });
}
