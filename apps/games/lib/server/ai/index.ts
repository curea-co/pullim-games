// LLM provider switch — actions.ts 가 import 하는 단일 entry.
// 근거: proc/plan/2026-05-28_gemini-adapter.md · proc/plan/2026-06-30_gemini-adapter-land.md
//
// 기본 provider: Anthropic Claude (현 동작 유지 — behavior-neutral 랜딩).
//   - 기존 actions.ts 는 anthropic 직접 import 였음 (KNOWN-TRADE-OFF 해소).
//   - Gemini 기본 전환은 prod GEMINI_API_KEY provisioning 후 별도 PR (default 플립).
// opt-in provider: Gemini (LLM_PROVIDER=gemini 명시 시 — native responseSchema·무료 티어).

import "server-only";

import * as anthropic from "./anthropic";
import * as gemini from "./gemini";

export type LlmProvider = "gemini" | "anthropic";

export function getLlmProvider(): LlmProvider {
  return process.env.LLM_PROVIDER === "gemini" ? "gemini" : "anthropic";
}

const impl = getLlmProvider() === "gemini" ? gemini : anthropic;

export const generateFromSourceLLM = impl.generateFromSourceLLM;
export const generateFromCurriculumLLM = impl.generateFromCurriculumLLM;

export type {
  GenerateFromSourceInput,
  GenerateFromSourceOutput,
  GenerateFromCurriculumInput,
  GenerateFromCurriculumOutput,
} from "./anthropic";
