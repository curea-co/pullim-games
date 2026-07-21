import { z } from "zod";

import { EventActionSchema } from "@/lib/core";

import type {
  CurriculumDataset,
  GameBinding,
  GameTemplate,
  JsonObject,
  JsonValue,
  LearningEvent,
  LaunchTokenPayload,
  PinnedGameActivity,
} from "./types";

const nonEmptyId = z.string().trim().min(1).max(200);
const MUTABLE_VERSION_ALIASES = new Set([
  "canary",
  "develop",
  "edge",
  "head",
  "latest",
  "main",
  "master",
  "next",
  "stable",
]);

/** semver뿐 아니라 날짜/해시 버전도 허용하되 가변 range와 `latest`는 거부한다. */
export const PinnedVersionSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine(
    (value) => {
      const normalized = value.toLowerCase();
      return (
        !MUTABLE_VERSION_ALIASES.has(normalized) &&
        !/(?:^|[.-])x(?:$|[.-])/i.test(value) &&
        !/[\s*^~<>=|]/.test(value)
      );
    },
    "정확한 불변 버전을 사용해야 합니다.",
  );

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

export const JsonObjectSchema: z.ZodType<JsonObject> = z.record(
  JsonValueSchema,
);

export const GAME_MODES = [
  "default",
  "review-queue",
  "time-attack",
  "deep-recall",
] as const;

export const GameModeSchema = z.enum(GAME_MODES);

export const REUSABLE_MECHANISM_COMPONENTS = [
  "Blank",
  "QuickQuiz",
  "Typing",
  "WordMatch",
] as const;

export const ReusableMechanismComponentSchema = z.enum(
  REUSABLE_MECHANISM_COMPONENTS,
);

function artifactRefSchema<TKind extends string>(kind: TKind) {
  return z
    .object({
      kind: z.literal(kind),
      id: nonEmptyId,
      version: PinnedVersionSchema,
      integrity: z.string().trim().min(1).max(500).optional(),
    })
    .strict();
}

export const GameTemplateRefSchema = artifactRefSchema("game-template");
export const CurriculumDatasetRefSchema = artifactRefSchema(
  "curriculum-dataset",
);
export const GameBindingRefSchema = artifactRefSchema("game-binding");

export const PinnedGameActivitySchema: z.ZodType<PinnedGameActivity> = z
  .object({
    binding: GameBindingRefSchema,
    template: GameTemplateRefSchema,
    curriculum: CurriculumDatasetRefSchema,
    gameId: nonEmptyId,
    mode: GameModeSchema,
  })
  .strict();

const CurriculumSlotDefinitionSchema = z
  .object({
    id: nonEmptyId,
    description: z.string().max(500).optional(),
    acceptedCardTypes: z.array(nonEmptyId).max(100).optional(),
    required: z.boolean().optional(),
  })
  .strict();

export const GameTemplateSchema: z.ZodType<GameTemplate> = z
  .object({
    kind: z.literal("game-template"),
    schemaVersion: z.literal("1.0"),
    id: nonEmptyId,
    version: PinnedVersionSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(1_000).optional(),
    runtime: z
      .object({
        kind: z.literal("registered-game"),
        gameId: nonEmptyId,
        protocolVersion: PinnedVersionSchema,
        mechanismComponent: ReusableMechanismComponentSchema.optional(),
      })
      .strict(),
    curriculumSlots: z.array(CurriculumSlotDefinitionSchema).max(20),
    supportedModes: z.array(GameModeSchema).min(1),
    defaultConfig: JsonObjectSchema.optional(),
    metadata: JsonObjectSchema.optional(),
  })
  .strict();

export const CurriculumScopeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("catalog"),
      path: z
        .object({
          gradeBand: z.enum(["elementary", "middle", "high"]),
          subject: z.enum(["english", "math", "korean", "science", "social"]),
          grade: z.number().int().min(1).max(12),
          unitId: nonEmptyId,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("seed"),
      subjectId: nonEmptyId,
      unitId: nonEmptyId,
    })
    .strict(),
  z
    .object({
      kind: z.literal("registered-game"),
      gameId: nonEmptyId,
      unit: z.string().trim().min(1).max(200).optional(),
    })
    .strict(),
]);

/** 기존 게임별 카드 Zod schema를 받아 데이터셋 전체 외부 입력을 검증한다. */
export function createCurriculumDatasetSchema<TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) {
  return z
    .object({
      kind: z.literal("curriculum-dataset"),
      schemaVersion: z.literal("1.0"),
      id: nonEmptyId,
      version: PinnedVersionSchema,
      title: z.string().trim().min(1).max(200),
      locale: z.string().trim().min(2).max(35),
      scope: CurriculumScopeSchema,
      standards: z.array(nonEmptyId).max(500).optional(),
      items: z.array(itemSchema).max(10_000),
      metadata: JsonObjectSchema.optional(),
    })
    .strict();
}

const CurriculumSelectionSchema = z
  .object({
    strategy: z.enum(["all", "adaptive", "random", "sequential"]),
    limit: z.number().int().positive().max(10_000).optional(),
    itemIds: z.array(nonEmptyId).max(10_000).optional(),
    tags: z.array(nonEmptyId).max(100).optional(),
  })
  .strict();

export const GameBindingSchema: z.ZodType<GameBinding> = z
  .object({
    kind: z.literal("game-binding"),
    schemaVersion: z.literal("1.0"),
    id: nonEmptyId,
    version: PinnedVersionSchema,
    title: z.string().trim().min(1).max(200).optional(),
    gameId: nonEmptyId,
    mode: GameModeSchema,
    template: GameTemplateRefSchema,
    curriculum: CurriculumDatasetRefSchema,
    slots: z
      .array(
        z
          .object({
            slotId: nonEmptyId,
            selection: CurriculumSelectionSchema,
          })
          .strict(),
      )
      .max(20),
    config: JsonObjectSchema.optional(),
    metadata: JsonObjectSchema.optional(),
  })
  .strict();

export const LaunchTokenPayloadSchema: z.ZodType<LaunchTokenPayload> = z
  .object({
    tokenVersion: z.literal("1.0"),
    iss: nonEmptyId,
    aud: z.union([nonEmptyId, z.array(nonEmptyId).min(1).max(20)]),
    sub: nonEmptyId,
    jti: nonEmptyId,
    iat: z.number().int().nonnegative(),
    nbf: z.number().int().nonnegative().optional(),
    exp: z.number().int().positive(),
    anonymousUserId: nonEmptyId,
    sessionId: nonEmptyId,
    activity: PinnedGameActivitySchema,
    launchConfig: JsonObjectSchema.optional(),
    scopes: z.array(nonEmptyId).max(50).optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.sub !== payload.anonymousUserId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sub"],
        message: "sub는 anonymousUserId와 같아야 합니다.",
      });
    }
    if (payload.exp <= payload.iat) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exp"],
        message: "exp는 iat보다 커야 합니다.",
      });
    }
    if (payload.nbf !== undefined && payload.nbf >= payload.exp) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nbf"],
        message: "nbf는 exp보다 작아야 합니다.",
      });
    }
  });

export const SemanticLearningEventTypeSchema = z.enum([
  "launch.started",
  "learning.attempted",
  "learning.struggled",
  "learning.completed",
  "session.completed",
  "session.abandoned",
]);

/** 기존 EventAction을 그대로 허용해 /api/event 소비자와 점진적으로 공존한다. */
export const LearningEventTypeSchema = z.union([
  EventActionSchema,
  SemanticLearningEventTypeSchema,
]);

export function createLearningEventSchema<
  TPayloadSchema extends z.ZodTypeAny,
>(payloadSchema: TPayloadSchema) {
  return z
    .object({
      schemaVersion: z.literal("1.0"),
      eventId: nonEmptyId,
      type: LearningEventTypeSchema,
      ts: z.number().int().nonnegative(),
      anonymousUserId: nonEmptyId,
      sessionId: nonEmptyId,
      activity: PinnedGameActivitySchema,
      standardId: nonEmptyId.optional(),
      itemId: nonEmptyId.optional(),
      durationMs: z.number().int().nonnegative().optional(),
      payload: payloadSchema,
      metadata: JsonObjectSchema.optional(),
    })
    .strict();
}

export const LearningEventSchema: z.ZodType<LearningEvent> =
  createLearningEventSchema(JsonObjectSchema);

/** schema factory 반환 타입과 공개 generic 계약의 대응을 위한 보조 타입. */
export type ParsedCurriculumDataset<TItemSchema extends z.ZodTypeAny> =
  CurriculumDataset<z.infer<TItemSchema>>;
