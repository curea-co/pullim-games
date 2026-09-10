// 일일 학습 스트릭 카운터 — 단일 백본 (사용자 단위, 게임 무관).
// plan 2026-05-15_fsrs-streak-backbone §1~§2.
//
// 룰:
//   - 로컬 자정 기준 (D1.A). UTC 아님.
//   - localStorage `pullim-games:streak` 단일 키, JSON (D2.A).
//   - lastActiveDate 가 어제 → current += 1
//   - lastActiveDate 가 2일+ 전 또는 없음 → current = 1 (longest 보존)
//   - lastActiveDate 가 오늘 → no-op
//
// 비스코프: 배지·시즌·그레이스·히트맵·서버 백업 (별 plan).

const STORAGE_KEY = "pullim-games:streak";

export interface StreakState {
  /** 현재 연속 학습일. */
  current: number;
  /** 역대 최장 연속 학습일. */
  longest: number;
  /** 마지막 활동 날짜 (YYYY-MM-DD, 로컬 자정 기준). 없으면 null. */
  lastActiveDate: string | null;
}

export function createInitialStreak(): StreakState {
  return { current: 0, longest: 0, lastActiveDate: null };
}

/** YYYY-MM-DD (로컬 자정 기준). */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD 두 개의 로컬 자정 기준 차이 (일). */
function dayDiff(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = toKey.split("-").map(Number) as [number, number, number];
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * `now` 시점에 활동을 기록. prev 가 없으면 첫 활동.
 * 순수 함수 — IO 없음. 호출자가 saveStreak 으로 영속화.
 */
export function recordActivity(prev: StreakState, now: Date = new Date()): StreakState {
  const todayKey = toDateKey(now);

  if (!prev.lastActiveDate) {
    return {
      current: 1,
      longest: Math.max(1, prev.longest),
      lastActiveDate: todayKey,
    };
  }

  const diff = dayDiff(prev.lastActiveDate, todayKey);

  if (diff === 0) {
    // 오늘 이미 기록됨 — no-op
    return prev;
  }

  if (diff === 1) {
    // 어제 → 오늘 — current +1
    const current = prev.current + 1;
    return {
      current,
      longest: Math.max(current, prev.longest),
      lastActiveDate: todayKey,
    };
  }

  // 2일+ 갭 — 리셋 (longest 보존)
  return {
    current: 1,
    longest: prev.longest,
    lastActiveDate: todayKey,
  };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadStreak(): StreakState {
  const storage = getStorage();
  if (!storage) return createInitialStreak();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createInitialStreak();
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    if (
      typeof parsed.current !== "number" ||
      typeof parsed.longest !== "number"
    ) {
      return createInitialStreak();
    }
    return {
      current: parsed.current,
      longest: parsed.longest,
      lastActiveDate:
        typeof parsed.lastActiveDate === "string" ? parsed.lastActiveDate : null,
    };
  } catch {
    return createInitialStreak();
  }
}

export function saveStreak(state: StreakState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silent — 학습 진행 보호
  }
}

/** 활동 기록 + 영속화 + 갱신된 상태 반환 (편의 wrapper). */
export function recordActivityAndSave(now: Date = new Date()): StreakState {
  const next = recordActivity(loadStreak(), now);
  saveStreak(next);
  return next;
}
