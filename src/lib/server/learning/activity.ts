// 활동 로그 서버 동기화 — per-device(device_id) 절대 카운터 + 서버 SUM 집계.
// 근거: proc/plan/2026-06-05_learning-data-server-sync.md §4.2·§4.3 (R1/R2/R5/R6) + #117 R3.
// device_id 는 fingerprint 가 아님(소유권 의미 분리). 표시값 = SUM(count).
// retention·집계 window 는 **date 버킷 기준**(updated_at 아님, R3): 오래된 date 가 재동기화만으로
// 14일 연장되거나 heatmap 에 재등장하지 않게.
import "server-only";
import { query, withTx } from "@/lib/server/db/client";

export type ActivityInput = { gameId: string; date: string; count: number };
export type ActivityAgg = { gameId: string; date: string; count: number };

const RETENTION_DAYS = 14;
// 로컬 규칙(activity-log.ts)은 **로컬 자정** 기준 14일. 서버는 클라 TZ 를 모르므로 UTC
// date 버킷으로 자른다. UTC↔로컬 자정 경계(±1일)에서 서버가 클라보다 먼저 지우면 "브라우저에
// 살아있는 활동이 sync 후 사라지는" 회귀가 난다(R4). → **GRACE 1일**을 더 둬서 서버 보존
// window 가 로컬 14일의 상위집합이 되게 한다(서버는 절대 클라보다 덜 보존하지 않음). 클라는
// 표시 시 자기 로컬 14일로 다시 prune 하므로 사용자에겐 정확히 14일.
const GRACE_DAYS = 1;

/**
 * now(epoch ms) 기준 서버 retention 하한 date 버킷("YYYY-MM-DD", UTC). 이 값 이상(inclusive) 보존.
 * inclusive `date >= cutoff` 비교라 `RETENTION_DAYS + GRACE_DAYS - 1` 일 전을 잡아야
 * 정확히 (14 로컬 + 1 grace) = 15개 버킷이 보존된다(R5 — -1 안 하면 16개로 한 칸 초과).
 */
export function retentionCutoffDate(now: number): string {
  const ms = (RETENTION_DAYS + GRACE_DAYS - 1) * 24 * 60 * 60 * 1000;
  return new Date(now - ms).toISOString().slice(0, 10);
}

type AggRow = { game_id: string; date: string; total: string | number };

/**
 * 대시보드용 집계 — SUM(count) GROUP BY game_id, date (game 차원 보존, R7).
 * **date 버킷 기준 최근 14일**(date >= cutoff). 크기 작아 전량 반환(증분 불필요).
 */
export async function pullActivityAggregate(
  userId: string,
  now: number,
): Promise<ActivityAgg[]> {
  const { rows } = await query<AggRow>(
    `SELECT game_id, date, SUM(count) AS total
       FROM activity_log
      WHERE user_id = $1 AND date >= $2
      GROUP BY game_id, date
      ORDER BY date ASC`,
    [userId, retentionCutoffDate(now)],
  );
  return rows.map((r) => ({ gameId: r.game_id, date: r.date, count: Number(r.total) }));
}

/**
 * 활동 배치 upsert — 본 기기(device_id)의 절대 카운터. count = GREATEST(단조 증가 보장).
 * **14일 window 밖 date 는 거부**(R3): 오래된 bucket 이 재전송으로 부활하지 못하게.
 */
export async function pushActivity(
  userId: string,
  deviceId: string,
  rows: ActivityInput[],
  now: number,
): Promise<void> {
  const cutoff = retentionCutoffDate(now);
  const fresh = rows.filter((a) => a.date >= cutoff);
  if (fresh.length === 0) return;
  await withTx(async (q) => {
    for (const a of fresh) {
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

/** date 버킷이 14일 초과 행 purge(서버측 주기 cleanup 의 권위 enforcer, R5/R3). */
export async function purgeStaleActivity(now: number): Promise<number> {
  const { rowCount } = await query(`DELETE FROM activity_log WHERE date < $1`, [
    retentionCutoffDate(now),
  ]);
  return rowCount ?? 0;
}
