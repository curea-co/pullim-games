// pullim 모드 회원 projection — pullim-api `sub` 를 games 로컬 `users` row 로 lazy upsert 하고
// 회원 grade(콘텐츠 preference, games-side)를 그 row 에 보관한다.
// 근거: spec/05 §5.2⒜⑵·§5.6, spec/09 §9.3 키 모델, plan §2-D. 대상 = games 자체 Postgres(D3).
//
// ⚠️ 키 모델: 저장/조인 키는 games `users.id`(신규 UUID), `sub` 는 외부 신원 매핑 컬럼(0004).
//    projection row 는 email/password_hash NULL + sub(0004 CHECK: legacy XOR pullim).
import "server-only";
import { randomUUID } from "node:crypto";
import { isGrade } from "@/lib/core/player";
import { query, type QueryFn } from "@/lib/server/db/client";

/** pullim projection row 의 앱 노출 형태(legacy email/pw 컬럼 비노출). */
export type PullimMemberRow = { id: string; sub: string; grade: string | null };

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
): Promise<PullimMemberRow> {
  const now = Date.now();
  const id = randomUUID();
  const { rows } = await exec<{ id: string; sub: string; grade: string | null }>(
    `INSERT INTO users (id, sub, created_at, updated_at, last_seen_at)
     VALUES ($1, $2, $3, $3, $3)
     ON CONFLICT (sub) WHERE sub IS NOT NULL
       DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, updated_at = EXCLUDED.updated_at
     RETURNING id, sub, grade`,
    [id, sub, now],
  );
  const r = rows[0];
  return { id: r.id, sub: r.sub, grade: normalizeGrade(r.grade) };
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
