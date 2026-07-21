import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { PinnedGameActivitySchema } from "@/lib/library";
import type { LaunchTokenPayload } from "@/lib/library";
import { query, type QueryFn } from "@/lib/server/db/client";
import { z } from "zod";

export const LIBRARY_LAUNCH_COOKIE = "pullim_games_library_launch";

type LibraryLaunchSessionRow = {
  token_hash: string;
  launch_payload: unknown;
  created_at: string | number;
  expires_at: string | number;
};

const StoredLibraryLaunchSessionSchema = z
  .object({
    launchId: z.string().trim().min(1).max(200),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
    anonymousUserId: z.string().trim().min(1).max(200),
    sessionId: z.string().trim().min(1).max(200),
    activity: PinnedGameActivitySchema,
  })
  .strict();

export type LibraryLaunchSession = z.infer<
  typeof StoredLibraryLaunchSessionSchema
>;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createLibraryLaunchSession(
  payload: LaunchTokenPayload,
  exec: QueryFn = query,
  now = Date.now(),
): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = payload.exp * 1_000;
  if (expiresAt <= now) throw new Error("launch_already_expired");

  const token = randomBytes(32).toString("hex");
  const stored: LibraryLaunchSession = {
    launchId: payload.jti,
    iat: payload.iat,
    exp: payload.exp,
    anonymousUserId: payload.anonymousUserId,
    sessionId: payload.sessionId,
    activity: payload.activity,
  };
  await exec(
    `INSERT INTO library_launch_sessions
       (token_hash, launch_payload, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [hashToken(token), JSON.stringify(stored), now, expiresAt],
  );
  await exec("DELETE FROM library_launch_sessions WHERE expires_at <= $1", [
    now,
  ]);
  return { token, expiresAt };
}

export async function getLibraryLaunchSession(
  token: string | null | undefined,
  exec: QueryFn = query,
  now = Date.now(),
): Promise<LibraryLaunchSession | null> {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return null;
  const tokenHash = hashToken(token);
  const { rows } = await exec<LibraryLaunchSessionRow>(
    `SELECT token_hash, launch_payload, created_at, expires_at
       FROM library_launch_sessions
      WHERE token_hash = $1
      LIMIT 1`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  if (Number(row.expires_at) <= now) {
    await exec("DELETE FROM library_launch_sessions WHERE token_hash = $1", [
      tokenHash,
    ]);
    return null;
  }

  const parsed = StoredLibraryLaunchSessionSchema.safeParse(
    row.launch_payload,
  );
  if (!parsed.success || parsed.data.exp * 1_000 <= now) {
    await exec("DELETE FROM library_launch_sessions WHERE token_hash = $1", [
      tokenHash,
    ]);
    return null;
  }
  return parsed.data;
}

export function readLibraryLaunchToken(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === LIBRARY_LAUNCH_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export function buildLibraryLaunchCookie(
  token: string,
  expiresAt: number,
  now = Date.now(),
): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.max(0, Math.floor((expiresAt - now) / 1_000));
  return `${LIBRARY_LAUNCH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

export function buildClearLibraryLaunchCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${LIBRARY_LAUNCH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}
