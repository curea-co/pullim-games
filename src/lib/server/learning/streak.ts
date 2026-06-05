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
 * 스트릭 머지 upsert.
 *   longest          = GREATEST(both)
 *   더 늦은 날짜      = incoming current/date 채택
 *   같은 날짜(no-op)  = current 는 GREATEST(both) — 늦게 도착한 stale write(작은 current)가
 *                      되돌리지 못하게(R1: A current=10 후 B current=3 동기화 시 10 유지)
 *   더 이른 날짜      = 기존 값 유지
 * last_active_date null 은 가장 과거로 취급(COALESCE '').
 */
export async function pushStreak(userId: string, incoming: StreakPayload): Promise<void> {
  // updated_at = nextval(시퀀스) — 단조 커서, 같은 ms 충돌 방지(#117 R8).
  await query(
    `INSERT INTO streaks (user_id, current, longest, last_active_date, updated_at)
     VALUES ($1, $2, $3, $4, nextval('learning_sync_seq'))
     ON CONFLICT (user_id) DO UPDATE SET
       longest = GREATEST(streaks.longest, EXCLUDED.longest),
       current = CASE
         WHEN COALESCE(EXCLUDED.last_active_date, '') > COALESCE(streaks.last_active_date, '')
           THEN EXCLUDED.current
         WHEN COALESCE(EXCLUDED.last_active_date, '') = COALESCE(streaks.last_active_date, '')
           THEN GREATEST(streaks.current, EXCLUDED.current)
         ELSE streaks.current END,
       last_active_date = CASE
         WHEN COALESCE(EXCLUDED.last_active_date, '') > COALESCE(streaks.last_active_date, '')
           THEN EXCLUDED.last_active_date ELSE streaks.last_active_date END,
       updated_at = nextval('learning_sync_seq')`,
    [userId, incoming.current, incoming.longest, incoming.lastActiveDate],
  );
}
