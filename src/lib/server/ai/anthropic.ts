// Anthropic Claude API 통합 — Mode B (자료 → 카드 자동 생성).
// Server-only. 클라이언트에서 직접 import 금지 (Server Action 통해서만).
// `2026-05-08_management-auto-generation.md` §3.2 따름.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BlankDraft,
  CustomCardDraft,
  CustomCardKind,
  MultipleChoiceDraft,
  TypingDraft,
  WordMatchDraft,
} from "@/lib/core";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4096;
const MAX_SOURCE_CHARS = 8000;

// ── Tool schemas (Anthropic tool-use 로 JSON 출력 강제) ──────────────

type ToolDef = Anthropic.Messages.Tool;

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
          },
          required: ["left", "right"],
        },
      },
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

function buildSystemPrompt(kind: CustomCardKind, count: number): string {
  const kindDesc = {
    typing: "어휘/용어 타이핑 카드",
    "word-match": "짝 매칭 카드",
    "multiple-choice": "객관식 4지선다 문제 카드",
    blank: "빈칸 채우기 카드",
  }[kind];
  return [
    "당신은 한국 고등학생용 학습 카드 자동 생성기입니다.",
    `주어진 자료에서 ${kindDesc} 를 정확히 ${count}장 추출 또는 생성하세요.`,
    "원칙:",
    "- 자료에 명시되지 않은 사실을 만들어내지 마세요.",
    "- 자료가 한국어면 카드도 한국어, 영어면 영어, 혼합이면 자연스럽게 매칭.",
    "- 학습 효과 최우선. 너무 쉽거나 명백한 카드 금지.",
    "- 반드시 제공된 도구(tool) 를 호출해 결과를 반환하세요. 자유 텍스트 응답 금지.",
  ].join("\n");
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

interface TypingToolInput {
  cards: { answer: string; meaning: string; pronunciation?: string }[];
}

interface WordMatchToolInput {
  pairs: { left: string; right: string }[];
}

interface MultipleChoiceToolInput {
  cards: {
    question: string;
    choices: string[];
    correctIndex: number;
    rationale?: string;
  }[];
}

interface BlankToolInput {
  cards: {
    passage: string;
    answer: string;
    distractors: string[];
    rationale?: string;
  }[];
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
        difficulty: 3,
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
      cards.push({ kind: "word-match", difficulty: 3, pairs: chunk });
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
          difficulty: 3,
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
        difficulty: 3,
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
