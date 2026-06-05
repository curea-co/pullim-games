// 스트릭 서버 동기화. 머지: longest=max, (current,last_active_date)=최신일.
// 근거: proc/plan/2026-06-05_learning-data-server-sync.md §4.3.
import "server-only";
import { query } from "@/lib/server/db/client";

export type StreakPayload = {
  current: number;
  longest: number;
  lastActiveDate: string | null;
};

type StreakRow = {
  current: number;
  longest: number;
  last_active_date: string | null;
  updated_at: string | number;
};

/** 사용자 스트릭. since 이후 변경 없으면 unchanged. */
export async function pullStreak(
  userId: string,
  since: number,
): Promise<{ streak: StreakPayload; cursor: number } | { unchanged: true; cursor: number }> {
  const { rows } = await query<StreakRow>(
    `SELECT current, longest, last_active_date, updated_at
       FROM streaks WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return { unchanged: true, cursor: since };
  const updatedAt = Number(row.updated_at);
  if (updatedAt <= since) return { unchanged: true, cursor: since };
  return {
    streak: { current: row.current, longest: row.longest, lastActiveDate: row.last_active_date },
    cursor: updatedAt,
  };
}

/**
 * 스트릭 머지 upsert. longest=GREATEST, (current,last_active_date)=last_active_date 더 최신인 쪽.
 * 기존 행 없으면 그대로 삽입. last_active_date null 은 가장 과거로 취급.
 */
export async function pushStreak(
  userId: string,
  incoming: StreakPayload,
  now: number,
): Promise<void> {
  await query(
    `INSERT INTO streaks (user_id, current, longest, last_active_date, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       longest = GREATEST(streaks.longest, EXCLUDED.longest),
       current = CASE
         WHEN COALESCE(EXCLUDED.last_active_date, '') >= COALESCE(streaks.last_active_date, '')
         THEN EXCLUDED.current ELSE streaks.current END,
       last_active_date = CASE
         WHEN COALESCE(EXCLUDED.last_active_date, '') >= COALESCE(streaks.last_active_date, '')
         THEN EXCLUDED.last_active_date ELSE streaks.last_active_date END,
       updated_at = EXCLUDED.updated_at`,
    [userId, incoming.current, incoming.longest, incoming.lastActiveDate, now],
  );
}
