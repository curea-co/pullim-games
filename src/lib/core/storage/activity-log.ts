// 게임별 일별 활동 카운터 — 14일 retention, localStorage 영속.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 2.
//
// 저장 키: pullim-games:activity-log:<gameId>
// 값: { "YYYY-MM-DD": count, ... }  // 최근 14일만 보관
//
// 호출 시점: saveSrsAndRecord wrapper 안에서 동거 (Phase 2 srs.ts 갱신).

const KEY_PREFIX = "pullim-games:activity-log";
const RETENTION_DAYS = 14;

type DateBucket = string; // "YYYY-MM-DD"
type ActivityMap = Record<DateBucket, number>;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function key(gameId: string): string {
  return `${KEY_PREFIX}:${gameId}`;
}

/** 로컬 자정 기준 YYYY-MM-DD. */
export function toDateBucket(d: Date): DateBucket {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadRaw(gameId: string): ActivityMap {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(key(gameId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: ActivityMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        result[k] = v;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** 14일 cutoff — 그보다 오래된 bucket 제거. */
function prune(map: ActivityMap, now: Date = new Date()): ActivityMap {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS + 1);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffBucket = toDateBucket(cutoff);
  const result: ActivityMap = {};
  for (const [k, v] of Object.entries(map)) {
    if (k >= cutoffBucket) result[k] = v;
  }
  return result;
}

/**
 * 1회 활동 기록 — 오늘 bucket count +1. 14일 retention prune 자동.
 * localStorage 실패 시 silent.
 * (이름 prefix `recordGame` — streak.recordActivity 와 충돌 회피)
 */
export function recordGameActivity(gameId: string, now: Date = new Date()): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const map = prune(loadRaw(gameId), now);
    const bucket = toDateBucket(now);
    map[bucket] = (map[bucket] ?? 0) + 1;
    storage.setItem(key(gameId), JSON.stringify(map));
  } catch {
    // localStorage 가득 차거나 거부됨
  }
}

/**
 * 최근 N일 활동 — bucket → count Map. 오래된 순서.
 * gameId 가 없거나 비어있으면 모든 bucket 0.
 */
export function loadActivity(
  gameId: string,
  days: number = RETENTION_DAYS,
  now: Date = new Date(),
): Array<{ date: DateBucket; count: number }> {
  const map = loadRaw(gameId);
  const result: Array<{ date: DateBucket; count: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const bucket = toDateBucket(d);
    result.push({ date: bucket, count: map[bucket] ?? 0 });
  }
  return result;
}

/**
 * 여러 게임 일괄 로드 — 히트맵 한 번에 그릴 때 사용.
 */
export function loadActivityForGames(
  gameIds: string[],
  days: number = RETENTION_DAYS,
  now: Date = new Date(),
): Map<string, Array<{ date: DateBucket; count: number }>> {
  const result = new Map<string, Array<{ date: DateBucket; count: number }>>();
  for (const id of gameIds) {
    result.set(id, loadActivity(id, days, now));
  }
  return result;
}

/** 테스트·리셋용. */
export function clearActivity(gameId?: string): void {
  const storage = getStorage();
  if (!storage) return;
  const prefix = gameId ? `${KEY_PREFIX}:${gameId}` : `${KEY_PREFIX}:`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (k?.startsWith(prefix)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => storage.removeItem(k));
}
