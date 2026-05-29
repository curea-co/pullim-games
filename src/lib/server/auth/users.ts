// 회원 CRUD + fingerprint 연결. 근거: proc/plan/2026-05-29_auth-login-signup.md.
import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/server/db/client";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
};

export type PublicUser = {
  id: string;
  email: string;
};

export function toPublicUser(u: UserRow): PublicUser {
  return { id: u.id, email: u.email };
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

/** 신규 회원 생성. 이메일 중복은 호출 전 검사하거나 UNIQUE 위반으로 throw. */
export async function createUser(email: string, passwordHash: string): Promise<UserRow> {
  const now = Date.now();
  const id = randomUUID();
  const { rows } = await query<UserRow>(
    `INSERT INTO users (id, email, password_hash, created_at, updated_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $4, $4)
     RETURNING *`,
    [id, email.trim().toLowerCase(), passwordHash, now],
  );
  return rows[0];
}

export async function touchLastSeen(userId: string): Promise<void> {
  await query("UPDATE users SET last_seen_at = $2 WHERE id = $1", [userId, Date.now()]);
}

/**
 * 익명 fingerprint 를 계정에 연결. 이미 다른 계정에 연결돼 있으면 현재 계정으로 갱신
 * (마지막 로그인 기기 = 현재 사용자). 멱등.
 */
export async function linkFingerprint(fingerprint: string, userId: string): Promise<void> {
  await query(
    `INSERT INTO fingerprint_links (fingerprint, user_id, linked_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (fingerprint)
     DO UPDATE SET user_id = EXCLUDED.user_id, linked_at = EXCLUDED.linked_at`,
    [fingerprint, userId, Date.now()],
  );
}
