// Google AI Studio (Gemini) provider — Mode A (curriculum) + Mode B (source paste).
// Server-only. anthropic.ts 와 동일한 public API surface — actions.ts 가 LLM_PROVIDER env 로 분기.
// 근거: proc/plan/2026-05-28_gemini-adapter.md
//
// anthropic.ts 와 비교한 핵심 차이:
//   - tool-use 2-step → responseJsonSchema 1-step (native structured output)
//   - response.text 가 JSON 문자열 — 파싱 후 cardsJsonToDrafts 로 변환
//   - 4 메커니즘 schema 는 anthropic.ts 의 tool input_schema 와 1:1 호환 형태 유지
//     (cardsJsonToDrafts 가 동일 input shape 을 기대)

import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
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

const MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 4096;
const MAX_SOURCE_CHARS = 8000;

// ── Response JSON Schema (4 메커니즘) ────────────────────────────────
// Gemini responseJsonSchema 가 지원하는 키워드만 사용 (type/properties/required/items/min*/max*/enum/description).

const DIFFICULTY_PROP = {
  type: "integer" as const,
  minimum: 1,
  maximum: 5,
  description:
    "난이도 1(가장 쉬움)~5(가장 어려움). 학년·단원 수준 + 카드 자체 도전도 기준. 미지정 시 3.",
};

const TYPING_SCHEMA = {
  type: "object" as const,
  properties: {
    cards: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          answer: { type: "string" as const, description: "정답 (단어/용어/식)" },
          meaning: { type: "string" as const, description: "뜻/설명" },
          pronunciation: {
            type: "string" as const,
            description: "한자/발음 등 부가 정보 (선택)",
          },
          difficulty: DIFFICULTY_PROP,
        },
        required: ["answer", "meaning"],
      },
    },
  },
  required: ["cards"],
};

const WORD_MATCH_SCHEMA = {
  type: "object" as const,
  properties: {
    pairs: {
      type: "array" as const,
      description: "짝 4-8개씩이 카드 1장",
      items: {
        type: "object" as const,
        properties: {
          left: { type: "string" as const },
          right: { type: "string" as const },
        },
        required: ["left", "right"],
      },
    },
    cardDifficulty: DIFFICULTY_PROP,
  },
  required: ["pairs"],
};

const MULTIPLE_CHOICE_SCHEMA = {
  type: "object" as const,
  properties: {
    cards: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          question: { type: "string" as const },
          choices: {
            type: "array" as const,
            items: { type: "string" as const },
            minItems: 4,
            maxItems: 4,
          },
          correctIndex: {
            type: "integer" as const,
            minimum: 0,
            maximum: 3,
          },
          rationale: { type: "string" as const, description: "정답 해설 (선택)" },
          difficulty: DIFFICULTY_PROP,
        },
        required: ["question", "choices", "correctIndex"],
      },
    },
  },
  required: ["cards"],
};

const BLANK_SCHEMA = {
  type: "object" as const,
  properties: {
    cards: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          passage: {
            type: "string" as const,
            description: "본문. 정답 자리에 ___ 토큰 삽입",
          },
          answer: { type: "string" as const },
          distractors: {
            type: "array" as const,
            items: { type: "string" as const },
            minItems: 3,
            maxItems: 3,
          },
          rationale: { type: "string" as const, description: "해설 (선택)" },
          difficulty: DIFFICULTY_PROP,
        },
        required: ["passage", "answer", "distractors"],
      },
    },
  },
  required: ["cards"],
};

const SCHEMA_BY_KIND: Record<CustomCardKind, object> = {
  typing: TYPING_SCHEMA,
  "word-match": WORD_MATCH_SCHEMA,
  "multiple-choice": MULTIPLE_CHOICE_SCHEMA,
  blank: BLANK_SCHEMA,
};

// ── Prompt builders (anthropic.ts 와 동일 문구 — V1 복제, 후속 PR 에서 공통화) ──

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
    "- 출력은 지정된 JSON 스키마를 정확히 따르세요. 추가 설명·마크다운 금지.",
  ].join("\n");
}

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
    "- 출력은 지정된 JSON 스키마를 정확히 따르세요. 추가 설명·마크다운 금지.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ── 클라이언트 ──────────────────────────────────────────────────────

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!cachedClient) {
    const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_AI_STUDIO_API_KEY 가 설정되지 않았어요. .env.local 또는 배포 환경변수를 확인하세요.",
      );
    }
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

// ── JSON → Draft 변환 (anthropic.ts 의 toolInputToDrafts 와 동일 로직) ──

type Difficulty = 1 | 2 | 3 | 4 | 5;

// spec/01 §21 — 외부 AI JSON 은 Zod 로 런타임 검증한다 (타입 단언 금지).
// API responseJsonSchema 가 1차 강제하지만, 신뢰 경계 밖 입력이므로 파싱 결과를 재검증.
const TypingJsonSchema = z.object({
  cards: z.array(
    z.object({
      answer: z.string(),
      meaning: z.string(),
      pronunciation: z.string().optional(),
      difficulty: z.number().optional(),
    }),
  ),
});
type TypingJson = z.infer<typeof TypingJsonSchema>;

const WordMatchJsonSchema = z.object({
  pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  cardDifficulty: z.number().optional(),
});
type WordMatchJson = z.infer<typeof WordMatchJsonSchema>;

const MultipleChoiceJsonSchema = z.object({
  cards: z.array(
    z.object({
      question: z.string(),
      choices: z.array(z.string()),
      correctIndex: z.number(),
      rationale: z.string().optional(),
      difficulty: z.number().optional(),
    }),
  ),
});
type MultipleChoiceJson = z.infer<typeof MultipleChoiceJsonSchema>;

const BlankJsonSchema = z.object({
  cards: z.array(
    z.object({
      passage: z.string(),
      answer: z.string(),
      distractors: z.array(z.string()),
      rationale: z.string().optional(),
      difficulty: z.number().optional(),
    }),
  ),
});
type BlankJson = z.infer<typeof BlankJsonSchema>;

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

function cardsJsonToDrafts(
  kind: CustomCardKind,
  input: unknown,
): CustomCardDraft[] {
  if (kind === "typing") {
    const parsed = TypingJsonSchema.safeParse(input);
    if (!parsed.success) return [];
    const i: TypingJson = parsed.data;
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
    const parsed = WordMatchJsonSchema.safeParse(input);
    if (!parsed.success) return [];
    const i: WordMatchJson = parsed.data;
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
    const parsed = MultipleChoiceJsonSchema.safeParse(input);
    if (!parsed.success) return [];
    const i: MultipleChoiceJson = parsed.data;
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
  const parsed = BlankJsonSchema.safeParse(input);
  if (!parsed.success) return [];
  const i: BlankJson = parsed.data;
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

function parseJsonResponse(text: string | undefined): unknown {
  if (!text) {
    throw new Error("AI 응답이 비어있어요. 다시 시도해주세요.");
  }
  // Gemini 가 드물게 ```json ... ``` 으로 감쌀 수 있어 방어적으로 처리.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI 응답을 JSON 으로 파싱할 수 없어요. 다시 시도해주세요.");
  }
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
  const client = getClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: `다음 자료에서 카드 ${count}장을 추출/생성하세요.\n\n[자료]\n${trimmed}`,
    config: {
      systemInstruction: buildSystemPrompt(kind, count),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseJsonSchema: SCHEMA_BY_KIND[kind],
    },
  });

  const json = parseJsonResponse(response.text);
  const drafts = cardsJsonToDrafts(kind, json);
  if (drafts.length === 0) {
    throw new Error(
      "AI 가 유효한 카드를 만들지 못했어요. 자료를 좀 더 구체적으로 준비해보세요.",
    );
  }
  return { drafts };
}

export interface GenerateFromCurriculumInput {
  path: CatalogPath;
  kind: CustomCardKind;
  count: number;
}

export interface GenerateFromCurriculumOutput {
  drafts: CustomCardDraft[];
}

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

  const client = getClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: `위 교육과정 컨텍스트에 맞춰 ${count}장의 ${KIND_DESC[kind]} 를 JSON 스키마에 맞춰 반환하세요.`,
    config: {
      systemInstruction: buildCurriculumSystemPrompt(kind, count, ctx, unit),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseJsonSchema: SCHEMA_BY_KIND[kind],
    },
  });

  const json = parseJsonResponse(response.text);
  const drafts = cardsJsonToDrafts(kind, json);
  if (drafts.length === 0) {
    throw new Error(
      "AI 가 유효한 카드를 만들지 못했어요. 다른 단원이나 다른 메커니즘을 시도해 보세요.",
    );
  }
  return { drafts };
}
