// ⏸️ DEFERRED/DORMANT (2026-07-08) — pullim-api 가 `/games/me` 의 emailMatchHash 를 revert(pullim-api
// PR #373)해, 이 경로는 **영구 inert** 다(API 가 emailMatchHash 를 안 줌 → introspect null → 아래 재연결
// no-op). games 회원 데이터 미라이브(PULLIM_MEMBER_DATA_ENABLED=off)라 pullim-Q 처럼 fresh-start·보류로
// 정렬. **의도적 파킹 — dead code 결함 아님**(제거 대신 보존, go-live 시 재판단). 상세: consume plan 헤더.
//
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
import { isGrade } from "@/lib/core/player";
import { withTx, type QueryFn } from "@/lib/server/db/client";
import { computeEmailMatchHash, getEmailMatchPepper } from "./email-match-hash";

/** 재연결 시도 결과(감사 로그·테스트용). */
export type RelinkOutcome =
  | { status: "dormant" } // pepper 미주입 또는 emailMatchHash null → 비활성
  | { status: "no_match" } // 매칭 legacy 없음(신규 회원)
  | { status: "ambiguous"; count: number } // 다중 매칭 → 보류(자동 흡수 안 함)
  | { status: "linked"; legacyId: string }; // 1:1 매칭 → 이관·파기 완료

/**
 * legacy email 지문 백필(멱등). pepper 존재 시, 아직 해시가 없는 legacy row(`sub IS NULL` +
 * email 有 + hash NULL)만 대상으로 HMAC 를 계산해 채운다. `email_match_hash IS NULL` 가드로
 * 최초 1회 전체 처리 후엔 대상 0건 → 저비용 no-op. pullim 모드에선 신규 legacy row 가 생기지
 * 않으므로 legacy 집합은 유계·정적(재연결이 진행되면 감소).
 * ⚠️ **요청(grade/session 저장) 트랜잭션 밖**에서 호출한다 — `ensureLegacyBackfillOnce` 로 감싸
 *    프로세스당 1회 자체 트랜잭션으로 커밋(사용자 요청이 O(N) 쓰기를 떠안지 않게, Codex #149).
 */
export async function backfillLegacyEmailMatchHashes(pepper: string, q: QueryFn): Promise<number> {
  const { rows } = await q<{ id: string; email: string }>(
    "SELECT id, email FROM users WHERE sub IS NULL AND email IS NOT NULL AND email_match_hash IS NULL",
  );
  for (const r of rows) {
    await q("UPDATE users SET email_match_hash = $2 WHERE id = $1", [
      r.id,
      computeEmailMatchHash(r.email, pepper),
    ]);
  }
  return rows.length;
}

// 프로세스당 1회 백필 가드. 성공 커밋된 promise 만 캐시(실패 시 리셋 → 다음 진입 재시도).
// email_match_hash IS NULL 가드 때문에 전 시스템에서 O(N) 쓰기는 사실상 1회(첫 커밋)만 발생하고,
// 이후 프로세스는 0건 SELECT 로 저비용 통과한다.
let backfillPromise: Promise<void> | null = null;

/**
 * legacy 지문 백필을 **자체 트랜잭션**으로 프로세스당 1회 보장. 재연결 lookup 전에 호출해
 * 해시가 커밋돼 있게 한다(요청 트랜잭션과 분리 → grade/session 저장 요청이 O(N) 을 안 떠안음).
 */
export function ensureLegacyBackfillOnce(pepper: string): Promise<void> {
  if (!backfillPromise) {
    backfillPromise = withTx((q) => backfillLegacyEmailMatchHashes(pepper, q))
      .then(() => undefined)
      .catch((e) => {
        backfillPromise = null; // 실패 시 리셋해 다음 진입에서 재시도(부분 백필로 인한 오탐 방지).
        throw e;
      });
  }
  return backfillPromise;
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

  // ⚠️ legacy 지문 백필은 이 함수 밖에서 `ensureLegacyBackfillOnce` 로 선행 커밋된다(요청 트랜잭션과
  //    분리). 여기선 이미 채워진 해시로 바로 대조만 한다.
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
  // grade 승계 — member 가 grade 없고, legacy grade 가 **타겟(중1~고1) 범위 내**일 때만 승계한다.
  //   범위 밖 legacy 값(고3 등)은 승계하지 않는다 — 쓰기 단계에서 정규화하지 않으면 잘못된 값이
  //   projection 에 잔존한다(read 정규화 계약과 불일치, Codex #149). 모달 수집값이 이후 덮어쓸 수 있음.
  if (member.grade === null && isGrade(legacy.grade)) {
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
