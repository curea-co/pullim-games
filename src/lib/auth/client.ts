// 클라이언트 측 인증 호출 래퍼. fingerprint 를 자동 동봉(익명→계정 연결).
// 근거: proc/plan/2026-05-29_auth-login-signup.md.
"use client";

import { getFingerprint } from "@/lib/core/fingerprint";

export type AuthUser = { id: string; email: string };

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; status: number };

async function postAuth(path: string, payload: Record<string, unknown>): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
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

export function signup(email: string, password: string, over14: boolean): Promise<AuthResult> {
  return postAuth("/api/auth/signup", {
    email,
    password,
    over14,
    fingerprint: getFingerprint() ?? undefined,
  });
}

export function login(email: string, password: string): Promise<AuthResult> {
  return postAuth("/api/auth/login", {
    email,
    password,
    fingerprint: getFingerprint() ?? undefined,
  });
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* 무시 — 쿠키는 서버가 제거 시도 */
  }
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await res.json()) as { user: AuthUser | null };
    return data.user;
  } catch {
    return null;
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
