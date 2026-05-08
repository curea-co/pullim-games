// 자료 → 카드 변환 파서.
// `2026-05-08_management-redesign.md` §7 따름.
//
// V0.5 룰 기반: 사용자가 명시한 형식을 따르면 자동 변환.
// AI 자동 추출은 V0.6+ (별도 plan), 본 파서는 schema 만 호환.

import type {
  CustomBlankCard,
  CustomMultipleChoiceCard,
  CustomTypingCard,
  CustomWordMatchCard,
} from "./types";

export interface ParseError {
  /** 1-based 라인 번호. */
  line: number;
  message: string;
}

export interface ParseResult<T> {
  cards: T[];
  errors: ParseError[];
}

// ── 공통 유틸 ──────────────────────────────────────────────

function splitDelim(line: string): string[] {
  if (line.includes("::")) return line.split("::").map((s) => s.trim());
  if (line.includes("\t")) return line.split("\t").map((s) => s.trim());
  return [line.trim()];
}

// ── typing ─────────────────────────────────────────────────

export type TypingDraft = Omit<
  CustomTypingCard,
  "id" | "subjectId" | "curriculumId" | "createdAt" | "updatedAt"
>;

export function parseTypingSource(text: string): ParseResult<TypingDraft> {
  const lines = text.split("\n");
  const cards: TypingDraft[] = [];
  const errors: ParseError[] = [];

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;
    const parts = splitDelim(line);
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      errors.push({
        line: i + 1,
        message: "정답::뜻 형식이 아니에요",
      });
      return;
    }
    cards.push({
      kind: "typing",
      difficulty: 3,
      answer: parts[0],
      meaning: parts[1],
      pronunciation: parts[2] || undefined,
    });
  });

  return { cards, errors };
}

// ── matching ───────────────────────────────────────────────

export type WordMatchDraft = Omit<
  CustomWordMatchCard,
  "id" | "subjectId" | "curriculumId" | "createdAt" | "updatedAt"
>;

const DEFAULT_PAIRS_PER_CARD = 5;
const MIN_PAIRS_PER_CARD = 4;
const MAX_PAIRS_PER_CARD = 8;

export function parseMatchingSource(
  text: string,
  pairsPerCard = DEFAULT_PAIRS_PER_CARD,
): ParseResult<WordMatchDraft> {
  if (
    pairsPerCard < MIN_PAIRS_PER_CARD ||
    pairsPerCard > MAX_PAIRS_PER_CARD
  ) {
    pairsPerCard = DEFAULT_PAIRS_PER_CARD;
  }
  const lines = text.split("\n");
  const allPairs: { left: string; right: string }[] = [];
  const errors: ParseError[] = [];

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;
    const parts = splitDelim(line);
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      errors.push({
        line: i + 1,
        message: "왼쪽::오른쪽 형식이 아니에요",
      });
      return;
    }
    allPairs.push({ left: parts[0], right: parts[1] });
  });

  // 묶음 — pairsPerCard 씩 카드 1장. 마지막 잔여가 4 미만이면 직전 카드에 합침.
  const cards: WordMatchDraft[] = [];
  for (let i = 0; i < allPairs.length; i += pairsPerCard) {
    const chunk = allPairs.slice(i, i + pairsPerCard);
    if (
      chunk.length < MIN_PAIRS_PER_CARD &&
      cards.length > 0 &&
      cards[cards.length - 1]!.pairs.length + chunk.length <= MAX_PAIRS_PER_CARD
    ) {
      cards[cards.length - 1]!.pairs.push(...chunk);
      continue;
    }
    if (chunk.length < MIN_PAIRS_PER_CARD) {
      errors.push({
        line: 0,
        message: `남은 짝 ${chunk.length}개는 카드 1장에 부족해요 (최소 4 짝). 더 입력해주세요.`,
      });
      continue;
    }
    cards.push({
      kind: "word-match",
      difficulty: 3,
      pairs: chunk,
    });
  }

  return { cards, errors };
}

// ── multiple-choice ────────────────────────────────────────

export type MultipleChoiceDraft = Omit<
  CustomMultipleChoiceCard,
  "id" | "subjectId" | "curriculumId" | "createdAt" | "updatedAt"
>;

const Q_RE = /^Q\s*[:.]\s*(.+)$/;
const CHOICE_RE = /^([A-D])\s*[)]\s*(.+)$/;
const ANSWER_RE = /^정답\s*[:：]\s*([A-D])\s*$/;

export function parseMultipleChoiceSource(
  text: string,
): ParseResult<MultipleChoiceDraft> {
  const blocks = text.split(/\n\s*\n/);
  const cards: MultipleChoiceDraft[] = [];
  const errors: ParseError[] = [];
  let lineCounter = 0;

  blocks.forEach((rawBlock, blockIdx) => {
    const blockStartLine = lineCounter + 1;
    lineCounter += rawBlock.split("\n").length + 1;

    const block = rawBlock.trim();
    if (!block) return;

    const blockLines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    let question: string | undefined;
    const choices = new Map<string, string>();
    let answerKey: string | undefined;

    for (const line of blockLines) {
      const qm = Q_RE.exec(line);
      const cm = CHOICE_RE.exec(line);
      const am = ANSWER_RE.exec(line);
      if (qm) {
        question = qm[1]!.trim();
      } else if (cm) {
        choices.set(cm[1]!, cm[2]!.trim());
      } else if (am) {
        answerKey = am[1];
      }
    }

    if (!question) {
      errors.push({
        line: blockStartLine,
        message: `블록 ${blockIdx + 1}: 'Q: ...' 라인이 없어요`,
      });
      return;
    }
    const choiceArr = ["A", "B", "C", "D"].map((k) => choices.get(k));
    if (choiceArr.some((c) => !c)) {
      errors.push({
        line: blockStartLine,
        message: `블록 ${blockIdx + 1}: 보기 4개 (A) ~ D)) 모두 필요해요`,
      });
      return;
    }
    if (!answerKey || !["A", "B", "C", "D"].includes(answerKey)) {
      errors.push({
        line: blockStartLine,
        message: `블록 ${blockIdx + 1}: '정답: A/B/C/D' 라인이 없어요`,
      });
      return;
    }

    cards.push({
      kind: "multiple-choice",
      difficulty: 3,
      question,
      choices: choiceArr as string[],
      correctIndex: ["A", "B", "C", "D"].indexOf(answerKey),
    });
  });

  return { cards, errors };
}

// ── blank ──────────────────────────────────────────────────

export type BlankDraft = Omit<
  CustomBlankCard,
  "id" | "subjectId" | "curriculumId" | "createdAt" | "updatedAt"
>;

const BLANK_MARKER_RE = /\[([^\]|]+(?:\|[^\]|]+){3})\]/;

export function parseBlankSource(text: string): ParseResult<BlankDraft> {
  const blocks = text.split(/\n\s*\n/);
  const cards: BlankDraft[] = [];
  const errors: ParseError[] = [];
  let lineCounter = 0;

  blocks.forEach((rawBlock, blockIdx) => {
    const blockStartLine = lineCounter + 1;
    lineCounter += rawBlock.split("\n").length + 1;

    const block = rawBlock.trim();
    if (!block) return;

    // 해설 라인 분리
    const lines = block.split("\n");
    let rationale: string | undefined;
    const passageLines: string[] = [];
    for (const line of lines) {
      const m = /^해설\s*[:：]\s*(.+)$/.exec(line.trim());
      if (m) {
        rationale = m[1]!.trim();
      } else {
        passageLines.push(line);
      }
    }
    const passage = passageLines.join("\n").trim();

    const markerMatch = BLANK_MARKER_RE.exec(passage);
    if (!markerMatch) {
      errors.push({
        line: blockStartLine,
        message: `블록 ${blockIdx + 1}: [정답|오답1|오답2|오답3] 마커가 없어요`,
      });
      return;
    }
    if (BLANK_MARKER_RE.exec(passage.slice(markerMatch.index + 1))) {
      errors.push({
        line: blockStartLine,
        message: `블록 ${blockIdx + 1}: 마커가 2개 이상이에요 — 단락당 1개`,
      });
      return;
    }

    const choices = markerMatch[1]!.split("|").map((s) => s.trim());
    if (choices.length !== 4 || choices.some((c) => !c)) {
      errors.push({
        line: blockStartLine,
        message: `블록 ${blockIdx + 1}: 마커 안 보기 4개 모두 필요해요`,
      });
      return;
    }
    const passageWithBlank =
      passage.slice(0, markerMatch.index) +
      "___" +
      passage.slice(markerMatch.index + markerMatch[0].length);

    cards.push({
      kind: "blank",
      difficulty: 3,
      passage: passageWithBlank,
      choices,
      correctIndex: 0,
      rationale,
    });
  });

  return { cards, errors };
}
