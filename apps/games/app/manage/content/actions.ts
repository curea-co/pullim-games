"use server";

// /manage/content Server Actions — Mode A (curriculum) + Mode B (자료 paste).
//   - Mode A 의 V1: seed JSON 정적 변환 (`seedSubjectId/seedUnitId`)
//   - Mode A 의 V1.5: catalog 4-depth path + LLM (`catalogPath`)
// spec/06 §6.10 + plan: 2026-05-27_curriculum-ai-content-creation.md

import {
  convertSeedToBlankDrafts,
  convertSeedToMultipleChoiceDrafts,
  convertSeedToTypingDrafts,
  convertSeedToWordMatchDrafts,
  findSeed,
  type CatalogPath,
  type CustomCardDraft,
  type CustomCardKind,
} from "@/lib/core";
// LLM provider switch (index.ts) — 기본 anthropic, LLM_PROVIDER=gemini 로 opt-in.
// 근거: proc/plan/2026-06-30_gemini-adapter-land.md (KNOWN-TRADE-OFF C 항목 해소).
import {
  generateFromCurriculumLLM,
  generateFromSourceLLM,
} from "@/lib/server/ai";

export interface GenerateResult {
  ok: boolean;
  drafts?: CustomCardDraft[];
  error?: string;
}

/**
 * Mode A — 두 가지 모드:
 *   1. seed JSON 정적 변환 (LLM 안 부름) — `seedSubjectId` + `seedUnitId` 제공 시
 *   2. catalog + LLM 생성 — `catalogPath` 제공 시
 * 둘 다 비면 error. spec/06 §6.10·§6.11.
 */
export async function generateFromCurriculumAction(input: {
  kind: CustomCardKind;
  count: number;
  /** V1 seed 변환 경로 (기존 인수분해). 우선 시도. */
  seedSubjectId?: string;
  seedUnitId?: string;
  /** V1.5 catalog + LLM 경로 (영어 5 학년). */
  catalogPath?: CatalogPath;
}): Promise<GenerateResult> {
  const { kind, count, seedSubjectId, seedUnitId, catalogPath } = input;
  if (count <= 0) {
    return { ok: false, error: "카드 수는 1 이상이어야 해요." };
  }
  // 타겟은 중·고등 — 초등은 풀림 주니어(별도 앱) 영역이라 생성 차단. picker(클라) 필터의
  // 서버측 강제(crafted·stale 요청 대비). 근거: proc/plan/2026-06-26_middle-high-target.md.
  if (catalogPath?.gradeBand === "elementary") {
    return { ok: false, error: "초등 콘텐츠는 풀림 주니어 영역이라 여기서 만들 수 없어요." };
  }

  // 1) seed-first: subject+unit 명시되면 정적 변환 시도. seed 없으면 catalog fallback.
  if (seedSubjectId && seedUnitId) {
    const seed = findSeed(seedSubjectId, seedUnitId);
    if (seed) {
      let drafts: CustomCardDraft[] = [];
      if (kind === "typing") drafts = convertSeedToTypingDrafts(seed, count);
      else if (kind === "word-match")
        drafts = convertSeedToWordMatchDrafts(seed, count);
      else if (kind === "multiple-choice")
        drafts = convertSeedToMultipleChoiceDrafts(seed, count);
      else if (kind === "blank") drafts = convertSeedToBlankDrafts(seed, count);
      if (drafts.length > 0) {
        return {
          ok: true,
          drafts: drafts.map((d) => ({ ...d, source: "curriculum-seed" })),
        };
      }
      return {
        ok: false,
        error: "이 단원에는 해당 게임 타입의 자료가 부족해요. 다른 게임 타입을 골라보세요.",
      };
    }
  }

  // 2) catalog + LLM
  if (catalogPath) {
    try {
      const { drafts } = await generateFromCurriculumLLM({
        path: catalogPath,
        kind,
        count,
      });
      return {
        ok: true,
        drafts: drafts.map((d) => ({ ...d, source: "curriculum-ai" })),
      };
    } catch (e) {
      console.error(
        "[manage/content/actions] generateFromCurriculumLLM 실패:",
        e,
      );
      return {
        ok: false,
        error: "자동 생성에 실패했어요. 잠시 후 다시 시도해주세요.",
      };
    }
  }

  return { ok: false, error: "단원이 선택되지 않았어요." };
}

/** Mode B: 자료 텍스트 → LLM 으로 카드 draft 생성. */
export async function generateFromSourceAction(input: {
  kind: CustomCardKind;
  sourceText: string;
  count: number;
}): Promise<GenerateResult> {
  try {
    const { drafts } = await generateFromSourceLLM(input);
    return {
      ok: true,
      drafts: drafts.map((d) => ({ ...d, source: "source-text-ai" })),
    };
  } catch (e) {
    console.error("[manage/content/actions] generateFromSourceLLM 실패:", e);
    return {
      ok: false,
      error: "자동 생성에 실패했어요. 잠시 후 다시 시도해주세요.",
    };
  }
}
