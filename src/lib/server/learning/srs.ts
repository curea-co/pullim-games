// SRS 카드 상태 서버 동기화 — pull(증분) / push(LWW upsert).
// 근거: proc/plan/2026-06-05_learning-data-server-sync.md §4.2·§4.3.
// 충돌 해소 = 서버 updated_at(서버 write 시각) LWW. push 는 last-writer-wins.
import "server-only";
import { query, withTx } from "@/lib/server/db/client";

export type SrsCardPayload = {
  gameId: string;
  cardId: string;
  fsrsCard: Record<string, unknown>;
  reviewCount: number;
  lastReviewAt: number | null;
};

type SrsRow = {
  game_id: string;
  card_id: string;
  fsrs_card: Record<string, unknown>;
  review_count: number;
  last_review_at: string | number | null;
  updated_at: string | number;
};

function rowToPayload(r: SrsRow): SrsCardPayload {
  return {
    gameId: r.game_id,
    cardId: r.card_id,
    fsrsCard: r.fsrs_card,
    reviewCount: r.review_count,
    lastReviewAt: r.last_review_at === null ? null : Number(r.last_review_at),
  };
}

/** since(epoch ms) 이후 변경된 카드만. cursor = 반환 행 중 최대 updated_at(없으면 since 유지). */
export async function pullSrs(
  userId: string,
  since: number,
): Promise<{ changed: SrsCardPayload[]; cursor: number }> {
  const { rows } = await query<SrsRow & { updated_at: string | number }>(
    `SELECT game_id, card_id, fsrs_card, review_count, last_review_at, updated_at
       FROM srs_states
      WHERE user_id = $1 AND updated_at > $2
      ORDER BY updated_at ASC`,
    [userId, since],
  );
  let cursor = since;
  for (const r of rows) cursor = Math.max(cursor, Number(r.updated_at));
  return { changed: rows.map(rowToPayload), cursor };
}

/**
 * 카드 배치 upsert — **데이터 recency(last_review_at) 기준 조건부**(R8). 무조건 덮어쓰면
 * 오프라인이던 기기의 오래된 SRS 가 늦게 도착할 때 최신 진도를 롤백한다(데이터 손실).
 * → 기존이 미리뷰(null)거나, 들어온 last_review_at 이 기존 이상일 때만 갱신. 더 오래된
 * payload 는 무시(no-op). last_review_at 미래값은 schema 에서 거부(굳음 방지). 멱등.
 */
export async function pushSrs(userId: string, cards: SrsCardPayload[]): Promise<void> {
  if (cards.length === 0) return;
  await withTx(async (q) => {
    for (const c of cards) {
      // updated_at = nextval(시퀀스) — 행마다 고유·단조. 커서 충돌 방지(#117 R8).
      await q(
        `INSERT INTO srs_states
           (user_id, game_id, card_id, fsrs_card, review_count, last_review_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, nextval('learning_sync_seq'))
         ON CONFLICT (user_id, game_id, card_id) DO UPDATE SET
           fsrs_card      = EXCLUDED.fsrs_card,
           review_count   = EXCLUDED.review_count,
           last_review_at = EXCLUDED.last_review_at,
           updated_at     = nextval('learning_sync_seq')
         WHERE srs_states.last_review_at IS NULL
            OR (EXCLUDED.last_review_at IS NOT NULL
                AND EXCLUDED.last_review_at >= srs_states.last_review_at)`,
        [userId, c.gameId, c.cardId, JSON.stringify(c.fsrsCard), c.reviewCount, c.lastReviewAt],
      );
    }
  });
}
