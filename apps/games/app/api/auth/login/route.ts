// POST /api/auth/login — 이메일+비밀번호 로그인.
// 근거: proc/plan/2026-05-29_auth-login-signup.md.
import { NextResponse } from "next/server";
import { LoginSchema } from "@/lib/server/auth/schemas";
import { verifyPasswordConstantTime } from "@/lib/server/auth/password";
import {
  findUserByEmail,
  linkFingerprint,
  touchLastSeen,
  toPublicUser,
} from "@/lib/server/auth/users";
import { buildSessionCookie, createSession } from "@/lib/server/auth/session";
import { resolveRateLimitKey } from "@/lib/server/auth/net";
import { checkRateLimits } from "@/lib/server/rate-limit";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { AUTH_CSRF_HEADER, authCsrf } from "@/lib/server/auth/csrf";
import { withTx } from "@/lib/server/db/client";

export async function POST(request: Request) {
  // CSRF 방어 — same-origin(1차) + double-submit 토큰(2차). login CSRF(외부 폼이
  // 피해자를 공격자 계정으로 로그인시키는 시나리오) 차단. SameSite=Lax 만으로는 새
  // 세션 쿠키 주입을 못 막으므로 Origin/Referer + 토큰 둘 다 검증.
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
  // 상수 시간 검증 — 사용자 부재여도 더미 해시로 compare 를 태워 타이밍 평준화.
  // 사용자 부재·비번 불일치 모두 동일 401 + 동일 응답 시간 (계정 열거 차단).
  const passwordOk = await verifyPasswordConstantTime(
    password,
    user?.password_hash ?? null,
  );
  if (!user || !passwordOk) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // 부분 커밋 방지 — fingerprint 연결·last_seen 갱신·세션 발급을 한 트랜잭션으로.
  // (signup 과 동일하게 원자화: 세션 INSERT 실패 시 앞선 변경이 롤백)
  const { token, expiresAt } = await withTx(async (q) => {
    if (fingerprint) await linkFingerprint(fingerprint, user.id, q);
    await touchLastSeen(user.id, q);
    return createSession(user.id, q);
  });
  return NextResponse.json(
    { user: toPublicUser(user) },
    { status: 200, headers: { "set-cookie": buildSessionCookie(token, expiresAt) } },
  );
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
