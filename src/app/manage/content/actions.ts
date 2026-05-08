"use server";

// /manage/content Server Actions — Mode A (curriculum seed) + Mode B (LLM).
// `2026-05-08_management-auto-generation.md` §3 따름.

import {
  convertSeedToBlankDrafts,
  convertSeedToMultipleChoiceDrafts,
  convertSeedToTypingDrafts,
  convertSeedToWordMatchDrafts,
  findSeed,
  type CustomCardDraft,
  type CustomCardKind,
} from "@/lib/core";
import { generateFromSourceLLM } from "@/lib/server/ai/anthropic";

export interface GenerateResult {
  ok: boolean;
  drafts?: CustomCardDraft[];
  error?: string;
}

/** Mode A: 교육과정 seed → 카드 draft. */
export async function generateFromCurriculumAction(input: {
  kind: CustomCardKind;
  subjectId: string;
  unitId: string;
  count: number;
}): Promise<GenerateResult> {
  const { kind, subjectId, unitId, count } = input;
  const seed = findSeed(subjectId, unitId);
  if (!seed) {
    return { ok: false, error: "선택한 단원을 찾을 수 없어요." };
  }
  if (count <= 0) {
    return { ok: false, error: "카드 수는 1 이상이어야 해요." };
  }

  let drafts: CustomCardDraft[] = [];
  if (kind === "typing") drafts = convertSeedToTypingDrafts(seed, count);
  else if (kind === "word-match")
    drafts = convertSeedToWordMatchDrafts(seed, count);
  else if (kind === "multiple-choice")
    drafts = convertSeedToMultipleChoiceDrafts(seed, count);
  else if (kind === "blank") drafts = convertSeedToBlankDrafts(seed, count);

  if (drafts.length === 0) {
    return {
      ok: false,
      error: "이 단원에는 해당 게임 타입의 자료가 부족해요. 다른 게임 타입을 골라보세요.",
    };
  }
  return { ok: true, drafts };
}

/** Mode B: 자료 텍스트 → LLM 으로 카드 draft 생성. */
export async function generateFromSourceAction(input: {
  kind: CustomCardKind;
  sourceText: string;
  count: number;
}): Promise<GenerateResult> {
  try {
    const { drafts } = await generateFromSourceLLM(input);
    return { ok: true, drafts };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "자동 생성에 실패했어요. 잠시 후 다시 시도해주세요.";
    return { ok: false, error: message };
  }
}
