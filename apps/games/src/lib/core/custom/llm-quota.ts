// LLM 호출 일일 가드 (spec/06 §6.12).
// sessionStorage 가 아닌 localStorage 사용 — 새 탭/리프레시 후에도 같은 날 카운트 누적.
// 키: pullim-games:llm-quota:YYYY-MM-DD. 자정(클라이언트 로컬) 리셋.

const KEY_PREFIX = "pullim-games:llm-quota";
export const DAILY_LIMIT = 30;

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function key(date = today()): string {
  return `${KEY_PREFIX}:${date}`;
}

export function getLlmQuotaUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(key());
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function getLlmQuotaRemaining(): number {
  return Math.max(0, DAILY_LIMIT - getLlmQuotaUsed());
}

export function incrementLlmQuota(): void {
  if (typeof window === "undefined") return;
  try {
    const n = getLlmQuotaUsed() + 1;
    window.localStorage.setItem(key(), String(n));
  } catch {
    // silent
  }
}

export function isLlmQuotaExhausted(): boolean {
  return getLlmQuotaRemaining() <= 0;
}
