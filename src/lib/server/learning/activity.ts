// 활동 로그 서버 동기화 — per-device(device_id) 절대 카운터 + 서버 SUM 집계.
// 근거: proc/plan/2026-06-05_learning-data-server-sync.md §4.2·§4.3 (R1/R2/R5/R6).
// device_id 는 fingerprint 가 아님(소유권 의미 분리). 표시값 = SUM(count).
import "server-only";
import { query, withTx } from "@/lib/server/db/client";

export type ActivityInput = { gameId: string; date: string; count: number };
export type ActivityAgg = { gameId: string; date: string; count: number };

const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

type AggRow = { game_id: string; date: string; total: string | number };

/**
 * 대시보드용 집계 — SUM(count) GROUP BY game_id, date (game 차원 보존, R7).
 * 14일 retention 범위만(updated_at >= now-14d). 크기 작아 전량 반환(증분 불필요).
 */
export async function pullActivityAggregate(
  userId: string,
  now: number,
): Promise<ActivityAgg[]> {
  const cutoff = now - RETENTION_MS;
  const { rows } = await query<AggRow>(
    `SELECT game_id, date, SUM(count) AS total
       FROM activity_log
      WHERE user_id = $1 AND updated_at >= $2
      GROUP BY game_id, date
      ORDER BY date ASC`,
    [userId, cutoff],
  );
  return rows.map((r) => ({ gameId: r.game_id, date: r.date, count: Number(r.total) }));
}

/**
 * 활동 배치 upsert — 본 기기(device_id)의 절대 카운터. count = GREATEST(단조 증가 보장).
 * updated_at = 서버 now(증분/retention 기준).
 */
export async function pushActivity(
  userId: string,
  deviceId: string,
  rows: ActivityInput[],
  now: number,
): Promise<void> {
  if (rows.length === 0) return;
  await withTx(async (q) => {
    for (const a of rows) {
      await q(
        `INSERT INTO activity_log (user_id, game_id, date, device_id, count, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, game_id, date, device_id) DO UPDATE SET
           count      = GREATEST(activity_log.count, EXCLUDED.count),
           updated_at = EXCLUDED.updated_at`,
        [userId, a.gameId, a.date, deviceId, a.count, now],
      );
    }
  });
}

/** 14일 초과 행 purge(서버측 주기 cleanup 의 권위 enforcer, R5). */
export async function purgeStaleActivity(now: number): Promise<number> {
  const { rowCount } = await query(`DELETE FROM activity_log WHERE updated_at < $1`, [
    now - RETENTION_MS,
  ]);
  return rowCount ?? 0;
}
