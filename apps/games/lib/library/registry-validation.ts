import { z } from "zod";

import { getGameById } from "@/lib/games/registry";
import { isModeSupportedFor } from "@/lib/games/supported-modes";
import type { GameManifest } from "@/lib/games/types";

import {
  createCurriculumDatasetSchema,
  GameBindingSchema,
  GameTemplateSchema,
} from "./schemas";
import type {
  CurriculumSlotDefinition,
  GameTemplate,
  PinnedGameActivity,
} from "./types";

/** registry gameId와 4 메커니즘 정본까지 확인하는 외부 입력 스키마. */
export const RegisteredGameTemplateSchema = GameTemplateSchema.superRefine(
  (template, context) => {
    const manifest = getGameById(template.runtime.gameId);
    if (!manifest) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["runtime", "gameId"],
        message: "등록되지 않은 gameId입니다.",
      });
      return;
    }

    if (
      manifest.meta.mechanismComponent !==
      template.runtime.mechanismComponent
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["runtime", "mechanismComponent"],
        message: "registry의 mechanismComponent와 일치해야 합니다.",
      });
    }

    for (const mode of template.supportedModes) {
      if (!isModeSupportedFor(manifest.meta.id, mode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supportedModes"],
          message: `${manifest.meta.id}에서 지원하지 않는 mode입니다: ${mode}`,
        });
      }
    }
  },
);

/** binding의 gameId와 FSRS mode 지원 여부를 registry 정본으로 검증한다. */
export const RegisteredGameBindingSchema = GameBindingSchema.superRefine(
  (binding, context) => {
    if (!getGameById(binding.gameId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gameId"],
        message: "등록되지 않은 gameId입니다.",
      });
      return;
    }
    if (!isModeSupportedFor(binding.gameId, binding.mode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mode"],
        message: `${binding.gameId}에서 지원하지 않는 mode입니다: ${binding.mode}`,
      });
    }
  },
);

/** registered-game scope를 쓰는 데이터셋만 registry 존재 여부를 추가 확인한다. */
export function createRegisteredCurriculumDatasetSchema<
  TItemSchema extends z.ZodTypeAny,
>(itemSchema: TItemSchema) {
  return createCurriculumDatasetSchema(itemSchema).superRefine(
    (dataset, context) => {
      if (
        dataset.scope.kind === "registered-game" &&
        !getGameById(dataset.scope.gameId)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scope", "gameId"],
          message: "등록되지 않은 gameId입니다.",
        });
      }
    },
  );
}

/** 기존 manifest가 가진 메타데이터를 복제하지 않고 Library template으로 투영한다. */
export function gameTemplateFromManifest(
  manifest: GameManifest,
  options: {
    readonly version: string;
    readonly protocolVersion: string;
    readonly curriculumSlots: readonly CurriculumSlotDefinition[];
  },
): GameTemplate {
  const supportedModes = (
    ["default", "review-queue", "time-attack", "deep-recall"] as const
  ).filter((mode) => isModeSupportedFor(manifest.meta.id, mode));

  return {
    kind: "game-template",
    schemaVersion: "1.0",
    id: manifest.meta.id,
    version: options.version,
    title: manifest.meta.title,
    description: manifest.meta.tagline,
    runtime: {
      kind: "registered-game",
      gameId: manifest.meta.id,
      protocolVersion: options.protocolVersion,
      mechanismComponent: manifest.meta.mechanismComponent,
    },
    curriculumSlots: options.curriculumSlots,
    supportedModes,
    metadata: {
      subject: manifest.meta.subject,
      unit: manifest.meta.unit,
      mechanic: manifest.meta.mechanic,
      retrievalDepth: manifest.meta.retrievalDepth,
    },
  };
}

/** 검증된 binding을 launch/event에 복사할 불변 참조 스냅샷으로 변환한다. */
export function pinGameActivity(
  binding: z.infer<typeof RegisteredGameBindingSchema>,
  options: { readonly bindingIntegrity?: string } = {},
): PinnedGameActivity {
  return {
    binding: {
      kind: "game-binding",
      id: binding.id,
      version: binding.version,
      integrity: options.bindingIntegrity,
    },
    template: binding.template,
    curriculum: binding.curriculum,
    gameId: binding.gameId,
    mode: binding.mode,
  };
}
