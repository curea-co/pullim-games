// P-B 회원 재연결 — legacy(email+pw) 회원이 SSO 로그인해 새 pullim `sub` projection 이 최초
// 생성될 때, emailMatchHash 로 옛 legacy row 를 찾아 학습데이터·grade·fingerprint 를 1:1 이관하고
// legacy row 를 파기한다.
// 근거: proc/plan/2026-07-08_pb-member-relink-consume.md §C·§E,
//       proc/plan/2026-07-07_HANDOFF-pullim-api-games-member-relink-P-B.md §3, spec/05 §5.2.
//
// 🔴 안전 규칙(§5.2 silent auto-merge 금지):
//   - **정확히 1건 매칭만 자동** 이관. 0건=신규(no-op), 2건+=충돌(보류 — 자동 흡수 금지, 감사 로그).
//   - 매칭 키는 pullim-api **검증된** email 의 지문이라 "본인" 근거는 성립하나, 전 과정 **멱등 + 감사 로그**.
//   - pepper 미주입/emailMatchHash null → **dormant**(no-op) — pullim-api 도 salt 없으면 지문 null.
// ⚠️ 반드시 트랜잭션 QueryFn(withTx) 안에서 호출한다 — 이관·파기가 원자적이어야 부분 이관 사고가 없다.
import "server-only";
import type { QueryFn } from "@/lib/server/db/client";
import { computeEmailMatchHash, getEmailMatchPepper } from "./email-match-hash";

/** 재연결 시도 결과(감사 로그·테스트용). */
export type RelinkOutcome =
  | { status: "dormant" } // pepper 미주입 또는 emailMatchHash null → 비활성
  | { status: "no_match" } // 매칭 legacy 없음(신규 회원)
  | { status: "ambiguous"; count: number } // 다중 매칭 → 보류(자동 흡수 안 함)
  | { status: "linked"; legacyId: string }; // 1:1 매칭 → 이관·파기 완료

/**
 * legacy email 지문 백필(멱등). pepper 존재 시, 아직 해시가 없는 legacy row(email 有·hash NULL)만
 * 대상으로 HMAC 를 계산해 채운다. 최초 1회 전체 처리 후엔 대상 0건(부분 인덱스 조회) → 저비용 no-op.
 * pullim 모드에선 신규 legacy row 가 생기지 않으므로 legacy 집합은 유계·정적(재연결이 진행되면 감소).
 */
export async function backfillLegacyEmailMatchHashes(pepper: string, q: QueryFn): Promise<number> {
  const { rows } = await q<{ id: string; email: string }>(
    "SELECT id, email FROM users WHERE email IS NOT NULL AND email_match_hash IS NULL",
  );
  for (const r of rows) {
    await q("UPDATE users SET email_match_hash = $2 WHERE id = $1", [
      r.id,
      computeEmailMatchHash(r.email, pepper),
    ]);
  }
  return rows.length;
}

/** 이관 대상 자식 테이블 — legacy id → member id. 전부 users(id) CASCADE. */
const CHILD_MIGRATIONS: readonly string[] = [
  // fingerprint_links: fingerprint 가 전역 PK — legacy 의 기기 연결을 member 로 복사(이미 소유 시 유지).
  `INSERT INTO fingerprint_links (fingerprint, user_id, linked_at)
     SELECT fingerprint, $1, linked_at FROM fingerprint_links WHERE user_id = $2
   ON CONFLICT (fingerprint) DO NOTHING`,
  // srs_states: PK(user_id, game_id, card_id). 충돌 시 LWW(서버 updated_at 큰 쪽).
  `INSERT INTO srs_states (user_id, game_id, card_id, fsrs_card, review_count, last_review_at, updated_at)
     SELECT $1, game_id, card_id, fsrs_card, review_count, last_review_at, updated_at
       FROM srs_states WHERE user_id = $2
   ON CONFLICT (user_id, game_id, card_id) DO UPDATE SET
     fsrs_card = EXCLUDED.fsrs_card, review_count = EXCLUDED.review_count,
     last_review_at = EXCLUDED.last_review_at, updated_at = EXCLUDED.updated_at
   WHERE EXCLUDED.updated_at > srs_states.updated_at`,
  // streaks: PK(user_id). longest=max, current/last_active=최신 updated_at, updated_at=max.
  `INSERT INTO streaks (user_id, current, longest, last_active_date, updated_at)
     SELECT $1, current, longest, last_active_date, updated_at FROM streaks WHERE user_id = $2
   ON CONFLICT (user_id) DO UPDATE SET
     longest = GREATEST(streaks.longest, EXCLUDED.longest),
     current = CASE WHEN EXCLUDED.updated_at > streaks.updated_at THEN EXCLUDED.current ELSE streaks.current END,
     last_active_date = CASE WHEN EXCLUDED.updated_at > streaks.updated_at THEN EXCLUDED.last_active_date ELSE streaks.last_active_date END,
     updated_at = GREATEST(streaks.updated_at, EXCLUDED.updated_at)`,
  // activity_log: PK(user_id, game_id, date, device_id). per-device 절대 카운터 → 충돌 시 count=max.
  `INSERT INTO activity_log (user_id, game_id, date, device_id, count, updated_at)
     SELECT $1, game_id, date, device_id, count, updated_at FROM activity_log WHERE user_id = $2
   ON CONFLICT (user_id, game_id, date, device_id) DO UPDATE SET
     count = GREATEST(activity_log.count, EXCLUDED.count),
     updated_at = GREATEST(activity_log.updated_at, EXCLUDED.updated_at)`,
  // custom_content: PK(user_id) 스냅샷 1행. 충돌 시 LWW.
  `INSERT INTO custom_content (user_id, snapshot, updated_at)
     SELECT $1, snapshot, updated_at FROM custom_content WHERE user_id = $2
   ON CONFLICT (user_id) DO UPDATE SET
     snapshot = CASE WHEN EXCLUDED.updated_at > custom_content.updated_at THEN EXCLUDED.snapshot ELSE custom_content.snapshot END,
     updated_at = GREATEST(custom_content.updated_at, EXCLUDED.updated_at)`,
];

/**
 * 최초 생성된 pullim member 에 대해 legacy 재연결을 시도한다. **트랜잭션 QueryFn 필수**.
 * @param member 방금 INSERT 된 pullim projection row(id=member.id, grade=member.grade)
 * @param emailMatchHash `/games/me` 가 준 지문(null 이면 dormant)
 */
export async function relinkLegacyMember(
  member: { id: string; grade: string | null },
  emailMatchHash: string | null,
  q: QueryFn,
): Promise<RelinkOutcome> {
  const pepper = getEmailMatchPepper();
  if (!pepper || !emailMatchHash) return { status: "dormant" };

  // legacy 지문 백필(멱등) 후 대조. 백필을 같은 트랜잭션에서 하므로 lookup 이 방금 채운 해시를 본다.
  await backfillLegacyEmailMatchHashes(pepper, q);

  // 매칭 legacy row 조회 — legacy 만(sub NULL) 대상. 동시 재연결 방지 위해 행 잠금.
  const { rows: matches } = await q<{ id: string; grade: string | null }>(
    `SELECT id, grade FROM users
       WHERE email_match_hash = $1 AND sub IS NULL AND email IS NOT NULL
       FOR UPDATE`,
    [emailMatchHash],
  );

  if (matches.length === 0) return { status: "no_match" };
  if (matches.length > 1) {
    // 다중 매칭 = 자동 흡수 금지(§5.2). 보류 — 감사 로그로 surface, 데이터는 건드리지 않는다.
    return { status: "ambiguous", count: matches.length };
  }

  const legacy = matches[0];
  // 자식 데이터 이관(멱등·LWW). 원본 legacy 자식은 아래 legacy user 파기 시 CASCADE 정리.
  for (const sql of CHILD_MIGRATIONS) {
    await q(sql, [member.id, legacy.id]);
  }
  // grade 승계 — member 가 grade 없을 때만 legacy grade 로(모달 수집값이 이후 덮어쓸 수 있음).
  if (member.grade === null && legacy.grade !== null) {
    await q("UPDATE users SET grade = $2, updated_at = $3 WHERE id = $1 AND grade IS NULL", [
      member.id,
      legacy.grade,
      Date.now(),
    ]);
  }
  // legacy row 파기 → 남은 legacy 자식·legacy auth_sessions CASCADE 정리. 재실행 시 이미 없으면 no-op(멱등).
  await q("DELETE FROM users WHERE id = $1", [legacy.id]);

  return { status: "linked", legacyId: legacy.id };
}
