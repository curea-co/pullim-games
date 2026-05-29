// opaque 세션 토큰 + HttpOnly 쿠키. JWT 미사용(arcade 패턴 차용).
// 근거: proc/plan/2026-05-29_auth-login-signup.md.
import "server-only";
import { randomBytes } from "node:crypto";
import { query, type QueryFn } from "@/lib/server/db/client";
import { findUserById, type UserRow } from "@/lib/server/auth/users";

export const SESSION_COOKIE = "pullim_games_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export type SessionRow = {
  token: string;
  user_id: string;
  created_at: number;
  expires_at: number;
};

/** 새 세션 생성 후 토큰·만료 반환. exec 를 주면 트랜잭션 안에서 실행. */
export async function createSession(
  userId: string,
  exec: QueryFn = query,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await exec(
    "INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
    [token, userId, now, expiresAt],
  );
  return { token, expiresAt };
}

/** 토큰으로 현재 사용자 조회. 만료/부재면 null (만료 세션은 정리). */
export async function getUserFromSessionToken(token: string | null | undefined): Promise<UserRow | null> {
  if (!token) return null;
  const { rows } = await query<SessionRow>(
    "SELECT * FROM auth_sessions WHERE token = $1 LIMIT 1",
    [token],
  );
  const session = rows[0];
  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    await destroySession(token);
    return null;
  }
  return findUserById(session.user_id);
}

export async function destroySession(token: string): Promise<void> {
  await query("DELETE FROM auth_sessions WHERE token = $1", [token]);
}

/** 쿠키 문자열에서 세션 토큰 추출 (요청 헤더용). */
export function readSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

/** Set-Cookie 값 생성 (로그인). */
export function buildSessionCookie(token: string, expiresAt: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

/** Set-Cookie 값 생성 (로그아웃 — 즉시 만료). */
export function buildClearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}
