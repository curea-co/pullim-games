// PreviewMock 라우터 — meta.mechanic + gameId 별 텍스트 variant 로 분기.
// `2026-05-11_preview-mocks.md` §4 따름.

import { ManipulationMock } from "./ManipulationMock";
import { SortingMock } from "./SortingMock";
import { MatchingMock } from "./MatchingMock";
import { MultipleChoiceMock } from "./MultipleChoiceMock";
import { TypingMock } from "./TypingMock";
import type { MockVariant } from "./shared";
import type { GameMeta } from "@/lib/games/types";

const VARIANT_BY_GAME_ID: Record<string, MockVariant> = {
  // manipulation
  factorization: { left: "x²-1", right: "(x+1)(x-1)" },
  "math-graph-shift": { left: "y=x²", right: "y=(x-1)²" },
  "physics-vector": { left: "(2,3)+(1,-1)", right: "(3,2)" },
  "chemistry-balance": { left: "H₂+O₂", right: "2H₂O" },
  // sorting
  "history-timeline": {
    itemsShuffled: ["조선", "삼국", "고려"],
    itemsSorted: ["삼국", "고려", "조선"],
  },
  "english-order": {
    itemsShuffled: ["am", "I", "happy"],
    itemsSorted: ["I", "am", "happy"],
  },
  // matching
  "english-word-match": {
    pairs: [
      { left: "apple", right: "사과" },
      { left: "book", right: "책" },
    ],
  },
  "custom-word-match": {
    pairs: [
      { left: "보기", right: "뜻" },
      { left: "낱말", right: "의미" },
    ],
  },
  // multiple-choice
  "math-quick-quiz": {
    question: "2 + 2 = ?",
    choices: ["3", "4", "5", "6"],
    correctIndex: 1,
  },
  "custom-multiple-choice": {
    question: "Q",
    choices: ["A", "B", "C", "D"],
    correctIndex: 1,
  },
  "english-blank": {
    question: "I ___ a book",
    choices: ["read", "reads", "reading", "reader"],
    correctIndex: 0,
  },
  "custom-blank": {
    question: "본문 ___",
    choices: ["정답", "오답1", "오답2", "오답3"],
    correctIndex: 0,
  },
  // typing
  "vocab-typing": { word: "photo", hint: "사진" },
  "custom-typing": { word: "정답", hint: "뜻" },
};

interface Props {
  meta: GameMeta;
  locked?: boolean;
}

export function PreviewMock({ meta, locked }: Props) {
  const variant = VARIANT_BY_GAME_ID[meta.id] ?? {};
  switch (meta.mechanic) {
    case "manipulation":
      return <ManipulationMock variant={variant} locked={locked} />;
    case "sorting":
      return <SortingMock variant={variant} locked={locked} />;
    case "matching":
      return <MatchingMock variant={variant} locked={locked} />;
    case "multiple-choice":
      return <MultipleChoiceMock variant={variant} locked={locked} />;
    case "typing":
      return <TypingMock variant={variant} locked={locked} />;
  }
}
