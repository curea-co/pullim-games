// POST /api/auth/login — 이메일+비밀번호 로그인.
// 근거: proc/plan/2026-05-29_auth-login-signup.md.
import { NextResponse } from "next/server";
import { LoginSchema } from "@/lib/server/auth/schemas";
import { verifyPassword } from "@/lib/server/auth/password";
import {
  findUserByEmail,
  linkFingerprint,
  touchLastSeen,
  toPublicUser,
} from "@/lib/server/auth/users";
import { buildSessionCookie, createSession } from "@/lib/server/auth/session";
import { resolveRateLimitKey } from "@/lib/server/auth/net";
import { checkRateLimits } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  // brute-force 방어 — IP 10/분 + 50/시간.
  const key = resolveRateLimitKey(request);
  if (!key) {
    return NextResponse.json({ error: "client_unidentified" }, { status: 400 });
  }
  const rl = checkRateLimits([
    { key: `login:${key}`, windowMs: 60_000, max: 10 },
    { key: `login:${key}`, windowMs: 60 * 60_000, max: 50 },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "schema_validation_failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { email, password, fingerprint } = parsed.data;

  const user = await findUserByEmail(email);
  // 사용자 부재·비번 불일치 모두 동일 401 (계정 존재 여부 누설 차단).
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  if (fingerprint) {
    await linkFingerprint(fingerprint, user.id);
  }
  await touchLastSeen(user.id);

  const { token, expiresAt } = await createSession(user.id);
  return NextResponse.json(
    { user: toPublicUser(user) },
    { status: 200, headers: { "set-cookie": buildSessionCookie(token, expiresAt) } },
  );
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
