// opaque 세션 토큰 + HttpOnly 쿠키. JWT 미사용(arcade 패턴 차용).
// 근거: proc/plan/2026-05-29_auth-login-signup.md.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { query, type QueryFn } from "@/lib/server/db/client";
import { findUserById, type UserRow } from "@/lib/server/auth/users";

export const SESSION_COOKIE = "pullim_games_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export type SessionRow = {
  token_hash: string;
  user_id: string;
  created_at: number;
  expires_at: number;
};

/**
 * 세션 토큰 해시 — 쿠키에는 원문 bearer 토큰을 주되 DB 에는 SHA-256 해시만 저장한다.
 * DB dump/조회 권한 유출만으로 살아있는 세션을 재사용하지 못하게 한다(세션 탈취 방어).
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 새 세션 생성 후 (원문)토큰·만료 반환. DB 에는 해시 저장. exec 로 트랜잭션 합성 가능. */
export async function createSession(
  userId: string,
  exec: QueryFn = query,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await exec(
    "INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
    [hashToken(token), userId, now, expiresAt],
  );
  // 만료 세션 기회적 purge — 별도 배치 인프라 없이 세션 생성 시점에 expired 행 정리.
  // (재방문 없는 사용자의 세션이 TTL 후에도 영구 잔존해 보존정책과 어긋나던 문제 해소.)
  await exec("DELETE FROM auth_sessions WHERE expires_at <= $1", [now]);
  return { token, expiresAt };
}

/** (원문)토큰으로 현재 사용자 조회. 해시 기준 매칭. 만료/부재면 null (만료 세션 정리). */
export async function getUserFromSessionToken(token: string | null | undefined): Promise<UserRow | null> {
  if (!token) return null;
  const { rows } = await query<SessionRow>(
    "SELECT * FROM auth_sessions WHERE token_hash = $1 LIMIT 1",
    [hashToken(token)],
  );
  const session = rows[0];
  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    await destroySession(token);
    return null;
  }
  return findUserById(session.user_id);
}

/** (원문)토큰 기준 세션 파기 — 해시로 변환해 삭제. */
export async function destroySession(token: string): Promise<void> {
  await query("DELETE FROM auth_sessions WHERE token_hash = $1", [hashToken(token)]);
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
