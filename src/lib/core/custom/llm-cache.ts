// LLM 결과 캐시 — catalog-ai 분기만 대상 (자료 paste·seed 는 캐시 무의미).
// 키: pullim-games:llm-cache:<gradeBand>::<subject>::<grade>::<unitId>::<kind>::<count>
// TTL 7일. 동일 path+kind+count 요청 시 LLM 스킵 → quota 절약 + 응답 즉시.
// spec/06 §6.10 + plan: 2026-05-27_curriculum-ai-content-creation.md §Phase 5 "단원별 결과 캐시".

import type { CustomCardDraft } from "./types";

const KEY_PREFIX = "pullim-games:llm-cache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheKeyInput {
  gradeBand: string;
  subject: string;
  grade: number;
  unitId: string;
  kind: string;
  count: number;
}

interface CacheEntry {
  savedAt: string; // ISO
  drafts: CustomCardDraft[];
}

function cacheKey(k: CacheKeyInput): string {
  return `${KEY_PREFIX}:${k.gradeBand}::${k.subject}::${k.grade}::${k.unitId}::${k.kind}::${k.count}`;
}

export function getCachedDrafts(k: CacheKeyInput): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(k));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed.savedAt || !Array.isArray(parsed.drafts)) return null;
    const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
    if (ageMs < 0 || ageMs > TTL_MS) {
      window.localStorage.removeItem(cacheKey(k));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedDrafts(
  k: CacheKeyInput,
  drafts: CustomCardDraft[],
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = {
      savedAt: new Date().toISOString(),
      drafts,
    };
    window.localStorage.setItem(cacheKey(k), JSON.stringify(entry));
  } catch {
    // 용량 초과·접근 거부 — 캐시는 best-effort
  }
}

export function clearCachedDrafts(k: CacheKeyInput): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(cacheKey(k));
  } catch {
    // silent
  }
}

/** 캐시 라벨 생성 — "1시간 전·3일 전" 형식. */
export function describeCacheAge(savedAtIso: string): string {
  const ms = Date.now() - new Date(savedAtIso).getTime();
  if (ms < 60 * 1000) return "방금";
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))}분 전`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))}시간 전`;
  return `${Math.floor(ms / (24 * 60 * 60 * 1000))}일 전`;
}
