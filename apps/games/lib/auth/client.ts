// 클라이언트 측 인증 호출 래퍼. fingerprint 를 자동 동봉(익명→계정 연결).
// 근거: proc/plan/2026-05-29_auth-login-signup.md.
"use client";

import { getFingerprint } from "@/lib/core/fingerprint";

export type AuthUser = { id: string; email: string };

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; status: number };

async function postAuth(
  path: string,
  payload: Record<string, unknown>,
  csrfToken: string | null,
): Promise<AuthResult> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (csrfToken) headers["x-csrf-token"] = csrfToken; // double-submit
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "network_error", status: 0 };
  }
  let data: { user?: AuthUser; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* 본문 없을 수 있음 */
  }
  if (res.ok && data.user) {
    return { ok: true, user: data.user };
  }
  return { ok: false, error: data.error ?? "unknown_error", status: res.status };
}

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)pullim-csrf-auth=([^;]+)/);
  return m ? m[1] : null;
}

/**
 * CSRF 토큰 확보(double-submit). **기존 쿠키가 있으면 재사용** — 매 호출 새 토큰으로 회전
 * 시키면 멀티탭/동시 제출에서 한 탭이 쿠키를 덮어써 다른 탭 제출이 403 자기충돌하기 때문.
 * (double-submit 보안은 cookie==header 일치에서 나오므로 토큰 freshness 는 불필요.)
 * 쿠키가 없을 때만 GET 으로 발급받는다. 쿠키는 non-HttpOnly(Path=/) 라 같은 출처에서 읽힘.
 */
async function ensureCsrf(): Promise<string | null> {
  const existing = readCsrfCookie();
  if (existing) return existing;
  try {
    await fetch("/api/auth/csrf", { cache: "no-store" });
  } catch {
    return null;
  }
  return readCsrfCookie();
}

export async function signup(
  email: string,
  password: string,
  over14: boolean,
): Promise<AuthResult> {
  const csrf = await ensureCsrf();
  return postAuth(
    "/api/auth/signup",
    { email, password, over14, fingerprint: getFingerprint() ?? undefined },
    csrf,
  );
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const csrf = await ensureCsrf();
  return postAuth(
    "/api/auth/login",
    { email, password, fingerprint: getFingerprint() ?? undefined },
    csrf,
  );
}

/** 로그아웃. 서버가 세션을 실제로 파기했는지(성공 여부) 반환 — 호출부가 상태 정합에 사용. */
export async function logout(): Promise<boolean> {
  try {
    const csrf = await ensureCsrf(); // signup/login 과 동일한 double-submit 방어
    const headers: Record<string, string> = {};
    if (csrf) headers["x-csrf-token"] = csrf;
    const res = await fetch("/api/auth/logout", { method: "POST", headers });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getMe(): Promise<AuthUser | null> {
  return (await getAuthState()).user;
}

/**
 * 회원 신원 + "판정 가능 여부"를 함께 반환(Codex #114 R2·R4).
 * `/api/auth/me`는 **응답을 실제로 받았고** 토큰(세션 쿠키) 보유 + 백엔드 장애일 때만 503
 * (`unavailable:true`)을 준다. 토큰 없으면 200 null 이라, unavailable=true 는 "회원 세션은
 * 있는데 검증 불가" 만 의미 → 게이트 fail-open 이 정밀(완전 무신원은 통과 못함).
 * ⚠️ **네트워크 오류(fetch 실패)는 응답이 없어 토큰 보유 여부를 알 수 없으므로 fail-open 하지
 * 않는다**(unavailable=false) — 그래야 무신원 사용자가 장애 순간 게이트를 통과하지 못한다.
 */
export async function getAuthState(): Promise<{
  user: AuthUser | null;
  unavailable: boolean;
}> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    // 503 = 응답 받음 + 토큰 보유 + 백엔드 장애 → 미확정(fail-open 대상).
    if (res.status === 503) return { user: null, unavailable: true };
    if (!res.ok) return { user: null, unavailable: false }; // 기타 비정상 = 보수적 닫힘.
    const data = (await res.json()) as { user: AuthUser | null };
    return { user: data.user ?? null, unavailable: false };
  } catch {
    // 응답 자체가 없음 → 토큰 보유 미상 → fail-closed(무신원 통과 방지).
    return { user: null, unavailable: false };
  }
}

/** 에러 코드 → 한국어 메시지. */
export function authErrorMessage(error: string, status: number): string {
  switch (error) {
    case "email_taken":
      return "이미 가입된 이메일이에요. 로그인해주세요.";
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 올바르지 않아요.";
    case "schema_validation_failed":
      return "입력값을 다시 확인해주세요.";
    case "rate_limited":
      return "시도가 너무 많아요. 잠시 후 다시 해주세요.";
    case "network_error":
      return "네트워크 오류예요. 연결을 확인해주세요.";
    default:
      return status >= 500 ? "서버 오류가 발생했어요." : "요청을 처리하지 못했어요.";
  }
}
