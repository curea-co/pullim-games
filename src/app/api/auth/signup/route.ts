// POST /api/auth/signup — 이메일+비밀번호 회원가입.
// 근거: proc/plan/2026-05-29_auth-login-signup.md, spec/05 §5.2·§5.6.
import { NextResponse } from "next/server";
import { SignupSchema } from "@/lib/server/auth/schemas";
import { hashPassword } from "@/lib/server/auth/password";
import {
  createUser,
  findUserByEmail,
  linkFingerprint,
  toPublicUser,
} from "@/lib/server/auth/users";
import {
  buildSessionCookie,
  createSession,
} from "@/lib/server/auth/session";
import { resolveRateLimitKey } from "@/lib/server/auth/net";
import { checkRateLimits } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  // 가입 abuse 방어 — IP 5/분 + 20/시간.
  const key = resolveRateLimitKey(request);
  if (!key) {
    return NextResponse.json({ error: "client_unidentified" }, { status: 400 });
  }
  const rl = checkRateLimits([
    { key: `signup:${key}`, windowMs: 60_000, max: 5 },
    { key: `signup:${key}`, windowMs: 60 * 60_000, max: 20 },
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

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "schema_validation_failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { email, password, fingerprint } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash);

  if (fingerprint) {
    await linkFingerprint(fingerprint, user.id);
  }

  const { token, expiresAt } = await createSession(user.id);
  return NextResponse.json(
    { user: toPublicUser(user) },
    { status: 201, headers: { "set-cookie": buildSessionCookie(token, expiresAt) } },
  );
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
