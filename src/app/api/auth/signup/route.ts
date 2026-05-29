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
import { isUniqueViolation, withTx } from "@/lib/server/db/client";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { AUTH_CSRF_HEADER, authCsrf } from "@/lib/server/auth/csrf";

export async function POST(request: Request) {
  // CSRF 방어 — same-origin(1차) + double-submit 토큰(2차). 외부 페이지가 사용자
  // 브라우저로 임의 계정 생성·세션 발급을 유도하는 것을 차단.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  if (
    !authCsrf.verify(
      authCsrf.readCookieToken(request.headers.get("cookie")),
      request.headers.get(AUTH_CSRF_HEADER),
    )
  ) {
    return NextResponse.json({ error: "forbidden_csrf" }, { status: 403 });
  }

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

  // 흔한 경우(이미 가입) 빠른 409. 경합은 아래 UNIQUE 위반 캐치가 처리.
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  // 회원 생성 + fingerprint 연결 + 세션 발급을 한 트랜잭션으로 원자화 —
  // 중간 실패 시 user 레코드가 고아로 남지 않게(재시도 시 email_taken 만 받는 문제 방지).
  let user;
  let token: string;
  let expiresAt: number;
  try {
    const out = await withTx(async (q) => {
      const u = await createUser(email, passwordHash, q);
      if (fingerprint) await linkFingerprint(fingerprint, u.id, q);
      const s = await createSession(u.id, q);
      return { u, s };
    });
    user = out.u;
    token = out.s.token;
    expiresAt = out.s.expiresAt;
  } catch (err) {
    // TOCTOU 경합: pre-check 통과 후 동시 가입 → users.email UNIQUE 위반 → 409.
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json(
    { user: toPublicUser(user) },
    { status: 201, headers: { "set-cookie": buildSessionCookie(token, expiresAt) } },
  );
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
