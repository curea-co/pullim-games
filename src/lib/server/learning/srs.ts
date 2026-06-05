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

/** 카드 배치 upsert. 서버 now 로 updated_at stamp(LWW). 멱등. */
export async function pushSrs(
  userId: string,
  cards: SrsCardPayload[],
  now: number,
): Promise<void> {
  if (cards.length === 0) return;
  await withTx(async (q) => {
    for (const c of cards) {
      await q(
        `INSERT INTO srs_states
           (user_id, game_id, card_id, fsrs_card, review_count, last_review_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, game_id, card_id) DO UPDATE SET
           fsrs_card      = EXCLUDED.fsrs_card,
           review_count   = EXCLUDED.review_count,
           last_review_at = EXCLUDED.last_review_at,
           updated_at     = EXCLUDED.updated_at`,
        [userId, c.gameId, c.cardId, JSON.stringify(c.fsrsCard), c.reviewCount, c.lastReviewAt, now],
      );
    }
  });
}
