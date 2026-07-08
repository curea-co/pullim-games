// pullim 모드 회원 projection — pullim-api `sub` 를 games 로컬 `users` row 로 lazy upsert 하고
// 회원 grade(콘텐츠 preference, games-side)를 그 row 에 보관한다.
// 근거: spec/05 §5.2⒜⑵·§5.6, spec/09 §9.3 키 모델, plan §2-D. 대상 = games 자체 Postgres(D3).
//
// ⚠️ 키 모델: 저장/조인 키는 games `users.id`(신규 UUID), `sub` 는 외부 신원 매핑 컬럼(0004).
//    projection row 는 email/password_hash NULL + sub(0004 CHECK: legacy XOR pullim).
import "server-only";
import { randomUUID } from "node:crypto";
import { isGrade } from "@/lib/core/player";
import { query, withTx, type QueryFn } from "@/lib/server/db/client";
import { relinkLegacyMember } from "./pullim-relink";

/**
 * 🔴 회원 서버 데이터(grade·projection) 저장 활성화 플래그 — **활성화 hard precondition 가드**(Codex #146).
 * plan §2-D 상 회원 서버 저장 활성화는 **P-B·P-C 둘 다** 닫혀야 한다(P-A displayName 은 완료):
 *  - **P-B(legacy 회원 재연결)**: 기존 legacy 회원이 SSO 로그인 시 fingerprint·서버 데이터가 새 `sub`
 *    projection 에 연결돼야 한다(first-writer-wins 상충 해소). 미완료 상태로 켜면 legacy 회원 데이터가
 *    새 projection 에서 끊기는 cutover 사고(§5.2).
 *  - **P-C(중앙 삭제 파기 전파)**: 중앙 계정 삭제 → games projection 삭제 전파(webhook/job) 미확정이면
 *    저장 시 중앙 삭제 후 orphan = 법적 파기 위반(§5.5·§5.6).
 * pullim 모드(로그인/게이트)와 **별개** — 로그인은 되되 회원 서버 저장은 이 플래그로 게이트.
 * **운영은 P-B·P-C 확정을 함께 확인한 뒤** `PULLIM_MEMBER_DATA_ENABLED=1` 로 켠다. 기본 OFF.
 */
export const MEMBER_DATA_STORAGE_ENABLED = process.env.PULLIM_MEMBER_DATA_ENABLED === "1";

/** pullim projection row 의 앱 노출 형태(legacy email/pw 컬럼 비노출). */
export type PullimMemberRow = { id: string; sub: string; grade: string | null };

/** ensurePullimMember 결과 — `created` 는 이번 호출에서 **새로 INSERT** 됐는지(=최초 진입). P-B 재연결 트리거. */
export type EnsurePullimMemberResult = PullimMemberRow & { created: boolean };

function normalizeGrade(g: string | null): string | null {
  // 타겟(중1~고1) 밖 값·null 은 null 로 정규화(toPublicUser·getPlayer 와 동일 계약).
  return isGrade(g) ? g : null;
}

/**
 * pullim 회원 projection row lazy upsert(sub 기준, 멱등). 최초 진입 시 생성, 재진입은 last_seen 갱신.
 * 저장 키 = games `users.id`(신규 UUID) — `sub` 로 통일하지 않는다(0004 부분 유니크 인덱스로 sub 유일).
 */
export async function ensurePullimMember(
  sub: string,
  exec: QueryFn = query,
): Promise<EnsurePullimMemberResult> {
  const now = Date.now();
  const id = randomUUID();
  // (xmax = 0) = 이번 문장이 INSERT 로 만든 새 튜플(ON CONFLICT UPDATE 는 xmax≠0). 최초 진입 판정 →
  //   P-B 재연결을 "새 sub row 최초 생성 시 1회"만 시도하게 한다. text::bigint 로 xid 비교를 명시 캐스팅.
  const { rows } = await exec<{ id: string; sub: string; grade: string | null; created: boolean }>(
    `INSERT INTO users (id, sub, created_at, updated_at, last_seen_at)
     VALUES ($1, $2, $3, $3, $3)
     ON CONFLICT (sub) WHERE sub IS NOT NULL
       DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, updated_at = EXCLUDED.updated_at
     RETURNING id, sub, grade, (xmax::text::bigint = 0) AS created`,
    [id, sub, now],
  );
  const r = rows[0];
  return { id: r.id, sub: r.sub, grade: normalizeGrade(r.grade), created: Boolean(r.created) };
}

/**
 * pullim 회원 projection 물질화 + P-B 재연결. **write 경로 전용**(첫 서버 저장 시 호출).
 * ensure(upsert) 와 재연결을 **단일 트랜잭션**으로 묶어, 새 sub row 최초 생성 시 legacy 데이터를
 * 원자적으로 이관한다. 재진입(created=false)이면 재연결 스킵(멱등). 결과는 감사 로그로 surface(§5.2).
 * @param emailMatchHash `/games/me` 지문(null=dormant) — 신원 검증은 호출부(introspection) 소관.
 */
export async function materializePullimMember(
  sub: string,
  emailMatchHash: string | null,
): Promise<PullimMemberRow> {
  return withTx(async (q) => {
    const m = await ensurePullimMember(sub, q);
    if (m.created) {
      const outcome = await relinkLegacyMember(m, emailMatchHash, q);
      // 감사 로그(silent 금지) — 성사·보류·dormant 를 구조화 기록. PII 없음(sub·legacyId·해시 미포함).
      if (outcome.status === "linked") {
        console.info(`[pb-relink] linked sub-member to legacy row (status=linked)`);
      } else if (outcome.status === "ambiguous") {
        console.warn(
          `[pb-relink] HELD ambiguous match (count=${outcome.count}) — 자동 흡수 안 함, 수동 확인 필요`,
        );
      }
      // 승계된 grade 재조회(재연결이 legacy grade 를 넣었을 수 있음).
      if (outcome.status === "linked") {
        const { rows } = await q<{ grade: string | null }>(
          "SELECT grade FROM users WHERE id = $1",
          [m.id],
        );
        return { id: m.id, sub: m.sub, grade: normalizeGrade(rows[0]?.grade ?? null) };
      }
    }
    return { id: m.id, sub: m.sub, grade: m.grade };
  });
}

/** pullim 회원 grade 조회(정규화). row 부재 시 null(미upsert). 모달의 "학년 미보유" 판정용. */
export async function getPullimMemberGrade(
  sub: string,
  exec: QueryFn = query,
): Promise<string | null> {
  const { rows } = await exec<{ grade: string | null }>(
    "SELECT grade FROM users WHERE sub = $1 LIMIT 1",
    [sub],
  );
  return rows[0] ? normalizeGrade(rows[0].grade) : null;
}

/**
 * pullim 회원 grade 저장(projection row upsert 후 set). 학년 수집 UX 가 호출.
 * grade 는 호출부에서 `isGrade` 검증 후 전달 — 여기서도 방어적으로 정규화한다.
 */
export async function setPullimMemberGrade(
  sub: string,
  grade: string,
  exec: QueryFn = query,
): Promise<void> {
  if (!isGrade(grade)) throw new Error(`invalid grade: ${grade}`);
  await ensurePullimMember(sub, exec); // row 보장(멱등)
  await exec("UPDATE users SET grade = $2, updated_at = $3 WHERE sub = $1", [
    sub,
    grade,
    Date.now(),
  ]);
}
