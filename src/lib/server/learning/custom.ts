// 커스텀 콘텐츠 서버 동기화 — 사용자당 컬렉션 스냅샷(LWW 전량 교체).
// 근거: proc/plan/2026-06-05_learning-data-server-sync.md §4.2·§4.3.
// per-row 아님: 삭제 전파를 위해 전체 컬렉션을 한 스냅샷으로 교체(tombstone 불필요).
import "server-only";
import { query } from "@/lib/server/db/client";

export type CustomSnapshot = {
  version: 1;
  exportedAt: string; // ISO — 조건부 교체 revision(오래된 스냅샷 거부용).
  subjects: unknown[];
  curriculum: unknown[];
  cards: unknown[];
  [k: string]: unknown;
};

type SnapshotRow = { snapshot: CustomSnapshot; updated_at: string | number };

/** since 이후 변경 없으면 unchanged(4MB 재전송 0). */
export async function pullCustom(
  userId: string,
  since: number,
): Promise<{ snapshot: CustomSnapshot; cursor: number } | { unchanged: true; cursor: number }> {
  const { rows } = await query<SnapshotRow>(
    `SELECT snapshot, updated_at FROM custom_content WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return { unchanged: true, cursor: since };
  const updatedAt = Number(row.updated_at);
  if (updatedAt <= since) return { unchanged: true, cursor: since };
  return { snapshot: row.snapshot, cursor: updatedAt };
}

/**
 * 스냅샷 전량 교체 — **exportedAt revision 기준 조건부**(R8). 무조건 교체하면 오래된
 * 브라우저 세션의 스냅샷이 늦게 도착할 때 최신 편집을 통째로 덮는다(데이터 손실).
 * → 들어온 exportedAt 이 기존 이상일 때만 교체. 더 오래된 스냅샷은 무시(no-op).
 * exportedAt 미래값은 schema 에서 거부. ISO 문자열 사전식 비교(YYYY-…) 정렬 일치.
 */
export async function pushCustom(
  userId: string,
  snapshot: CustomSnapshot,
  now: number,
): Promise<void> {
  await query(
    `INSERT INTO custom_content (user_id, snapshot, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       snapshot   = EXCLUDED.snapshot,
       updated_at = EXCLUDED.updated_at
     WHERE COALESCE(custom_content.snapshot->>'exportedAt', '')
           <= EXCLUDED.snapshot->>'exportedAt'`,
    [userId, JSON.stringify(snapshot), now],
  );
}
