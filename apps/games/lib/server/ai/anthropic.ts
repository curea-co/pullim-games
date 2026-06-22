// Anthropic Claude API 통합 — Mode B (자료 → 카드 자동 생성).
// Server-only. 클라이언트에서 직접 import 금지 (Server Action 통해서만).
// `2026-05-08_management-auto-generation.md` §3.2 따름.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BlankDraft,
  CatalogUnit,
  CustomCardDraft,
  CustomCardKind,
  MultipleChoiceDraft,
  TypingDraft,
  WordMatchDraft,
} from "@/lib/core";
import { findCatalogGradeContext, findCatalogUnit } from "@/lib/core";
import type { CatalogPath } from "@/lib/core";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4096;
const MAX_SOURCE_CHARS = 8000;

// ── Tool schemas (Anthropic tool-use 로 JSON 출력 강제) ──────────────

type ToolDef = Anthropic.Messages.Tool;

const DIFFICULTY_PROP = {
  type: "integer" as const,
  minimum: 1,
  maximum: 5,
  description:
    "난이도 1(가장 쉬움)~5(가장 어려움). 학년·단원 수준 + 카드 자체 도전도 기준. 미지정 시 3.",
};

const TYPING_TOOL: ToolDef = {
  name: "extract_typing_cards",
  description:
    "주어진 자료에서 학습용 타이핑 카드를 추출/생성합니다. 어휘·용어·핵심 개념 위주로.",
  input_schema: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            answer: { type: "string", description: "정답 (단어/용어/식)" },
            meaning: { type: "string", description: "뜻/설명" },
            pronunciation: {
              type: "string",
              description: "한자/발음 등 부가 정보 (선택)",
            },
            difficulty: DIFFICULTY_PROP,
          },
          required: ["answer", "meaning"],
        },
      },
    },
    required: ["cards"],
  },
};

const WORD_MATCH_TOOL: ToolDef = {
  name: "extract_word_match_cards",
  description:
    "주어진 자료에서 짝 매칭 카드를 추출합니다. 영-한, 동의어, 정의-개념, 식-결과 등 자연스러운 짝.",
  input_schema: {
    type: "object",
    properties: {
      pairs: {
        type: "array",
        description: "짝 4-8개씩이 카드 1장",
        items: {
          type: "object",
          properties: {
            left: { type: "string" },
            right: { type: "string" },
            // word-match 는 카드별이 아닌 pairs 단위 → 카드 난이도는 LLM 이 카드 평균에서 추론.
          },
          required: ["left", "right"],
        },
      },
      cardDifficulty: DIFFICULTY_PROP,
    },
    required: ["pairs"],
  },
};

const MULTIPLE_CHOICE_TOOL: ToolDef = {
  name: "extract_multiple_choice_cards",
  description: "주어진 자료를 기반으로 객관식 4지선다 카드를 생성합니다.",
  input_schema: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            choices: {
              type: "array",
              items: { type: "string" },
              minItems: 4,
              maxItems: 4,
            },
            correctIndex: {
              type: "integer",
              minimum: 0,
              maximum: 3,
            },
            rationale: { type: "string", description: "정답 해설 (선택)" },
            difficulty: DIFFICULTY_PROP,
          },
          required: ["question", "choices", "correctIndex"],
        },
      },
    },
    required: ["cards"],
  },
};

const BLANK_TOOL: ToolDef = {
  name: "extract_blank_cards",
  description:
    "주어진 자료를 기반으로 빈칸 카드를 생성합니다. passage 안의 정답 자리는 ___ 로 표시.",
  input_schema: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            passage: {
              type: "string",
              description: "본문. 정답 자리에 ___ 토큰 삽입",
            },
            answer: { type: "string" },
            distractors: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
            rationale: { type: "string", description: "해설 (선택)" },
            difficulty: DIFFICULTY_PROP,
          },
          required: ["passage", "answer", "distractors"],
        },
      },
    },
    required: ["cards"],
  },
};

const TOOL_BY_KIND: Record<CustomCardKind, ToolDef> = {
  typing: TYPING_TOOL,
  "word-match": WORD_MATCH_TOOL,
  "multiple-choice": MULTIPLE_CHOICE_TOOL,
  blank: BLANK_TOOL,
};

// ── Prompt builders ────────────────────────────────────────────────

const KIND_DESC: Record<CustomCardKind, string> = {
  typing: "어휘/용어 타이핑 카드",
  "word-match": "짝 매칭 카드",
  "multiple-choice": "객관식 4지선다 문제 카드",
  blank: "빈칸 채우기 카드",
};

function buildSystemPrompt(kind: CustomCardKind, count: number): string {
  return [
    "당신은 한국 고등학생용 학습 카드 자동 생성기입니다.",
    `주어진 자료에서 ${KIND_DESC[kind]} 를 정확히 ${count}장 추출 또는 생성하세요.`,
    "원칙:",
    "- 자료에 명시되지 않은 사실을 만들어내지 마세요.",
    "- 자료가 한국어면 카드도 한국어, 영어면 영어, 혼합이면 자연스럽게 매칭.",
    "- 학습 효과 최우선. 너무 쉽거나 명백한 카드 금지.",
    "- 각 카드에 난이도 1(가장 쉬움)~5(가장 어려움) 를 매기세요 — 자료 안 학습 곡선·인지 부하 기준.",
    "- 반드시 제공된 도구(tool) 를 호출해 결과를 반환하세요. 자유 텍스트 응답 금지.",
  ].join("\n");
}

/** Mode A 교육과정 컨텍스트 — catalog 단원 메타를 system prompt 에 주입. spec/06 §6.10. */
function buildCurriculumSystemPrompt(
  kind: CustomCardKind,
  count: number,
  ctx: { gradeBandName: string; subjectName: string; gradeName: string },
  unit: CatalogUnit,
): string {
  return [
    `당신은 한국 ${ctx.gradeBandName} ${ctx.subjectName} 학습 카드 자동 생성기입니다 (${ctx.gradeName} ${unit.unitName} 단원).`,
    `정확히 ${count}장의 ${KIND_DESC[kind]} 를 생성하세요.`,
    "",
    "[교육과정 컨텍스트]",
    `- 학년·단원: ${ctx.gradeName} · ${unit.unitName}`,
    `- 성취기준 (${unit.achievementCodes.join(", ")}): ${unit.achievementText}`,
    unit.focusVocab?.length
      ? `- 핵심 어휘 시드 (반드시 이 어휘들만 쓰지는 말 것 — 단원 수준의 다른 어휘도 자유롭게 사용): ${unit.focusVocab.join(", ")}`
      : "",
    unit.focusGrammar?.length
      ? `- 핵심 문법·표현: ${unit.focusGrammar.join(", ")}`
      : "",
    "",
    "원칙:",
    `- 위 성취기준과 단원 수준에 맞춰 학년 적합한 난이도로. ${ctx.gradeName} 학생이 이해할 수 있는 어휘·문법만 사용.`,
    "- 단어·표현·문장 모두 단원 주제 범위 안에서 생성. 다른 단원의 핵심 어휘 도용 금지.",
    "- 같은 카드가 중복되지 않게 다양화. 예시·문장 패턴·맥락을 바꿔서 변별력 확보.",
    "- 각 카드에 난이도 1(가장 쉬움)~5(가장 어려움) 를 학년 안의 상대 척도로 매기세요. 학년·단원 평균은 3, 도입 어휘는 1~2, 응용·생산은 4~5.",
    "- 학습 효과 최우선. 너무 쉽거나 명백한 카드 금지.",
    "- 반드시 제공된 도구(tool) 를 호출해 결과를 반환하세요. 자유 텍스트 응답 금지.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getToolName(kind: CustomCardKind): string {
  return TOOL_BY_KIND[kind].name;
}

// ── 클라이언트 ──────────────────────────────────────────────────────

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!cachedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY 가 설정되지 않았어요. .env.local 또는 배포 환경변수를 확인하세요.",
      );
    }
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

// ── 변환 ────────────────────────────────────────────────────────────

type Difficulty = 1 | 2 | 3 | 4 | 5;

interface TypingToolInput {
  cards: {
    answer: string;
    meaning: string;
    pronunciation?: string;
    difficulty?: number;
  }[];
}

interface WordMatchToolInput {
  pairs: { left: string; right: string }[];
  cardDifficulty?: number;
}

interface MultipleChoiceToolInput {
  cards: {
    question: string;
    choices: string[];
    correctIndex: number;
    rationale?: string;
    difficulty?: number;
  }[];
}

interface BlankToolInput {
  cards: {
    passage: string;
    answer: string;
    distractors: string[];
    rationale?: string;
    difficulty?: number;
  }[];
}

/** LLM 이 1~5 외 값을 반환할 위험 차단. 미지정·잘못된 값은 3 fallback. */
function clampDifficulty(d: number | undefined): Difficulty {
  if (typeof d !== "number" || Number.isNaN(d)) return 3;
  const n = Math.round(d);
  if (n < 1) return 1;
  if (n > 5) return 5;
  return n as Difficulty;
}

const PAIRS_PER_CARD = 5;
const PAIRS_MIN = 4;
const PAIRS_MAX = 8;

function toolInputToDrafts(
  kind: CustomCardKind,
  input: unknown,
): CustomCardDraft[] {
  if (kind === "typing") {
    const i = input as TypingToolInput;
    if (!Array.isArray(i?.cards)) return [];
    return i.cards.map(
      (c): TypingDraft => ({
        kind: "typing",
        difficulty: clampDifficulty(c.difficulty),
        answer: String(c.answer ?? "").trim(),
        meaning: String(c.meaning ?? "").trim(),
        pronunciation: c.pronunciation
          ? String(c.pronunciation).trim()
          : undefined,
      }),
    );
  }
  if (kind === "word-match") {
    const i = input as WordMatchToolInput;
    if (!Array.isArray(i?.pairs)) return [];
    const cardDiff = clampDifficulty(i.cardDifficulty);
    const pairs = i.pairs
      .map((p) => ({
        left: String(p.left ?? "").trim(),
        right: String(p.right ?? "").trim(),
      }))
      .filter((p) => p.left && p.right);
    const cards: WordMatchDraft[] = [];
    for (let idx = 0; idx < pairs.length; idx += PAIRS_PER_CARD) {
      const chunk = pairs.slice(idx, idx + PAIRS_PER_CARD);
      if (
        chunk.length < PAIRS_MIN &&
        cards.length > 0 &&
        cards[cards.length - 1]!.pairs.length + chunk.length <= PAIRS_MAX
      ) {
        cards[cards.length - 1]!.pairs.push(...chunk);
        continue;
      }
      if (chunk.length < PAIRS_MIN) continue;
      cards.push({ kind: "word-match", difficulty: cardDiff, pairs: chunk });
    }
    return cards;
  }
  if (kind === "multiple-choice") {
    const i = input as MultipleChoiceToolInput;
    if (!Array.isArray(i?.cards)) return [];
    return i.cards
      .filter(
        (c) =>
          Array.isArray(c.choices) &&
          c.choices.length === 4 &&
          typeof c.correctIndex === "number" &&
          c.correctIndex >= 0 &&
          c.correctIndex <= 3,
      )
      .map(
        (c): MultipleChoiceDraft => ({
          kind: "multiple-choice",
          difficulty: clampDifficulty(c.difficulty),
          question: String(c.question ?? "").trim(),
          choices: c.choices.map((x) => String(x).trim()),
          correctIndex: c.correctIndex,
          hint: c.rationale ? String(c.rationale).trim() : undefined,
        }),
      );
  }
  // blank
  const i = input as BlankToolInput;
  if (!Array.isArray(i?.cards)) return [];
  return i.cards
    .filter(
      (c) =>
        c.answer &&
        Array.isArray(c.distractors) &&
        c.distractors.length === 3 &&
        c.passage,
    )
    .map((c): BlankDraft => {
      const passage = String(c.passage).includes("___")
        ? String(c.passage)
        : `${c.passage} ___`;
      return {
        kind: "blank",
        difficulty: clampDifficulty(c.difficulty),
        passage: passage.trim(),
        choices: [
          String(c.answer).trim(),
          ...c.distractors.map((x) => String(x).trim()),
        ],
        correctIndex: 0,
        rationale: c.rationale ? String(c.rationale).trim() : undefined,
      };
    });
}

// ── 공개 API ────────────────────────────────────────────────────────

export interface GenerateFromSourceInput {
  kind: CustomCardKind;
  sourceText: string;
  count: number;
}

export interface GenerateFromSourceOutput {
  drafts: CustomCardDraft[];
}

/**
 * 사용자가 paste 한 자료를 LLM 으로 변환해 카드 draft 배열을 반환.
 * 실패 시 throw — 호출자(Server Action) 가 친절한 메시지로 변환.
 */
export async function generateFromSourceLLM(
  input: GenerateFromSourceInput,
): Promise<GenerateFromSourceOutput> {
  const { kind, sourceText, count } = input;
  if (!sourceText.trim()) {
    throw new Error("자료가 비어있어요. 텍스트를 붙여넣어 주세요.");
  }
  if (count <= 0) {
    throw new Error("카드 수는 1 이상이어야 해요.");
  }

  const trimmed = sourceText.slice(0, MAX_SOURCE_CHARS);
  const tool = TOOL_BY_KIND[kind];
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(kind, count),
    tools: [tool],
    tool_choice: { type: "tool", name: getToolName(kind) },
    messages: [
      {
        role: "user",
        content: `다음 자료에서 카드 ${count}장을 추출/생성해 ${tool.name} 도구로 반환하세요.\n\n[자료]\n${trimmed}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock =>
      block.type === "tool_use" && block.name === getToolName(kind),
  );

  if (!toolUse) {
    throw new Error("AI 응답에서 도구 호출을 찾지 못했어요. 다시 시도해주세요.");
  }

  const drafts = toolInputToDrafts(kind, toolUse.input);
  if (drafts.length === 0) {
    throw new Error(
      "AI 가 유효한 카드를 만들지 못했어요. 자료를 좀 더 구체적으로 준비해보세요.",
    );
  }
  return { drafts };
}

// ── Mode A — 교육과정 catalog 기반 LLM 생성 ─────────────────────────

export interface GenerateFromCurriculumInput {
  path: CatalogPath;
  kind: CustomCardKind;
  count: number;
}

export interface GenerateFromCurriculumOutput {
  drafts: CustomCardDraft[];
}

/**
 * catalog 단원 메타(성취기준 + 핵심 어휘) 를 system prompt 컨텍스트로 넘기고
 * Mode B 와 동일한 tool-use 패턴으로 카드 draft 배열을 생성한다.
 * 실패 시 throw — 호출자(Server Action) 가 친절한 메시지로 변환.
 */
export async function generateFromCurriculumLLM(
  input: GenerateFromCurriculumInput,
): Promise<GenerateFromCurriculumOutput> {
  const { path, kind, count } = input;
  if (count <= 0) {
    throw new Error("카드 수는 1 이상이어야 해요.");
  }

  const unit = findCatalogUnit(path);
  const ctx = findCatalogGradeContext(path);
  if (!unit || !ctx) {
    throw new Error("선택한 단원을 찾을 수 없어요.");
  }

  const tool = TOOL_BY_KIND[kind];
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildCurriculumSystemPrompt(kind, count, ctx, unit),
    tools: [tool],
    tool_choice: { type: "tool", name: getToolName(kind) },
    messages: [
      {
        role: "user",
        content: `위 교육과정 컨텍스트에 맞춰 ${count}장의 ${KIND_DESC[kind]} 를 ${tool.name} 도구로 반환하세요.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock =>
      block.type === "tool_use" && block.name === getToolName(kind),
  );

  if (!toolUse) {
    throw new Error("AI 응답에서 도구 호출을 찾지 못했어요. 다시 시도해주세요.");
  }

  const drafts = toolInputToDrafts(kind, toolUse.input);
  if (drafts.length === 0) {
    throw new Error(
      "AI 가 유효한 카드를 만들지 못했어요. 다른 단원이나 다른 메커니즘을 시도해 보세요.",
    );
  }
  return { drafts };
}
