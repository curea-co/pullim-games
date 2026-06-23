// 회원 CRUD + fingerprint 연결. 근거: proc/plan/2026-05-29_auth-login-signup.md.
import "server-only";
import { randomUUID } from "node:crypto";
import { query, type QueryFn } from "@/lib/server/db/client";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  /** 중등 학년(중1~중3) — 가입 시 수집. 레거시 회원은 null(migration 0003). */
  grade: string | null;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
};

export type PublicUser = {
  id: string;
  email: string;
  /** 중등 학년(중1~중3). 레거시 회원은 null. 프로필 뱃지·학년별 게임 노출에 사용. */
  grade: string | null;
};

export function toPublicUser(u: UserRow): PublicUser {
  return { id: u.id, email: u.email, grade: u.grade ?? null };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email.trim().toLowerCase()],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ?? null;
}

/**
 * 신규 회원 생성. 이메일 UNIQUE 위반 시 throw(23505) — 호출부가 409 로 매핑.
 * exec 를 주면 트랜잭션 안에서 실행(가입 원자화용).
 */
export async function createUser(
  email: string,
  passwordHash: string,
  grade: string,
  exec: QueryFn = query,
): Promise<UserRow> {
  const now = Date.now();
  const id = randomUUID();
  const { rows } = await exec<UserRow>(
    `INSERT INTO users (id, email, password_hash, grade, created_at, updated_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $5, $5)
     RETURNING *`,
    [id, email.trim().toLowerCase(), passwordHash, grade, now],
  );
  return rows[0];
}

export async function touchLastSeen(userId: string, exec: QueryFn = query): Promise<void> {
  await exec("UPDATE users SET last_seen_at = $2 WHERE id = $1", [userId, Date.now()]);
}

/**
 * 익명 fingerprint 를 계정에 연결. 이미 다른 계정에 연결돼 있으면 현재 계정으로 갱신
 * (마지막 로그인 기기 = 현재 사용자). 멱등.
 */
/**
 * fingerprint 를 계정에 연결. **첫 귀속 계정이 소유** — 이미 다른 user 에 묶인 fingerprint
 * 는 자동 재귀속하지 않는다(ON CONFLICT DO NOTHING). 공유 브라우저에서 마지막 로그인
 * 계정으로 귀속이 조용히 덮어써져 후속 익명 진행도 흡수/귀속 근거가 망가지는 것을 방지.
 * (계정 간 명시적 fingerprint 이전은 후속 phase.)
 */
export async function linkFingerprint(
  fingerprint: string,
  userId: string,
  exec: QueryFn = query,
): Promise<void> {
  await exec(
    `INSERT INTO fingerprint_links (fingerprint, user_id, linked_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (fingerprint) DO NOTHING`,
    [fingerprint, userId, Date.now()],
  );
}
