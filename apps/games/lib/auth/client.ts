// 클라이언트 측 인증 호출 래퍼. fingerprint 를 자동 동봉(익명→계정 연결).
// 근거: proc/plan/2026-05-29_auth-login-signup.md.
"use client";

import { getFingerprint } from "@/lib/core/fingerprint";
import { PULLIM_MODE, PULLIM_DOMAIN_API_URL } from "@/lib/auth/pullim-mode";

// 서버 PublicUser 와 동일 계약 — 가입 시 수집한 중·고 학년(레거시 회원은 null).
// signup·login·/me 응답이 모두 grade 를 싣는다(프로필 뱃지·학년별 노출용).
export type AuthUser = { id: string; email: string; grade: string | null };

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
  consent: boolean,
  grade: string,
): Promise<AuthResult> {
  const csrf = await ensureCsrf();
  return postAuth(
    "/api/auth/signup",
    { email, password, consent, grade, fingerprint: getFingerprint() ?? undefined },
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
  if (PULLIM_MODE) return pullimLogout();
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

// pullim 모드 로그아웃 — 회원 세션은 pullim-api 발급 `.pullim.ai` `*-pullim-at` 쿠키라
// local `/api/auth/logout`(host-only `pullim_games_session` 만 지움)으로는 못 지운다(로그아웃해도
// 새로고침 시 재로그인 — Codex #141). → 중앙 로그아웃 `POST ${DOMAIN_API_URL}/auth/logout` 위임
// (credentials:include + CSRF double-submit). pullim-api 가 `.pullim.ai` 세션·CSRF 쿠키를 클리어.
async function pullimLogout(): Promise<boolean> {
  try {
    // double-submit CSRF: GET /auth/csrf 로 `*-pullim-csrf` 쿠키 발급받고 그 값을 헤더로 echo.
    await fetch(`${PULLIM_DOMAIN_API_URL}/auth/csrf`, {
      credentials: "include",
      cache: "no-store",
    });
    const csrf = readPullimCsrfCookie();
    const res = await fetch(`${PULLIM_DOMAIN_API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** pullim-api CSRF 쿠키(`*-pullim-csrf` suffix, non-HttpOnly) 값 읽기 — double-submit echo 용. */
function readPullimCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  for (const pair of document.cookie.split(";")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    if (name.endsWith("-pullim-csrf")) {
      return decodeURIComponent(pair.slice(eq + 1)) || null;
    }
  }
  return null;
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
  if (PULLIM_MODE) return getPullimAuthState();
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

// pullim 모드 정밀 게이트(2단 게이트 계약 클라 측, spec/05 §5.2 R9) — 회원 세션 검증을
// pullim-api introspection(`GET /games/me`, credentials:include)으로 한다. 미들웨어 coarse
// (`*-pullim-at` presence)를 통과한 트래픽의 만료/위조 정밀 판정 + fail-open.
// ⚠️ 게이트 목적의 최소 신원만 매핑(id=sub). grade·표시명(email)은 P-A 계약(pullim-api /games/me
//    확장) 전까지 미제공 → 콘텐츠 타게팅·회원 표시명은 PR-2/P-A 에서 연결. 게이트엔 무관.
async function getPullimAuthState(): Promise<{
  user: AuthUser | null;
  unavailable: boolean;
}> {
  try {
    const res = await fetch(`${PULLIM_DOMAIN_API_URL}/games/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { sub?: string };
      if (!data.sub) return { user: null, unavailable: false }; // 계약 위반 방어.
      // 최소 AuthUser — grade/email 은 P-A 전까지 null(게이트 무관, 표시/콘텐츠는 P-A).
      return { user: { id: data.sub, email: "", grade: null }, unavailable: false };
    }
    if (res.status === 401) return { user: null, unavailable: false }; // 미인증 확정.
    // 5xx/기타 = 미확정 → fail-open. 미들웨어가 이미 `*-pullim-at` presence 를 통과시켰으므로
    // 회원 세션은 존재 → pullim-api 일시 장애로 회원을 튕기지 않는다(R9, 가용성 보존).
    return { user: null, unavailable: true };
  } catch {
    // 네트워크 오류 = 미확정 → fail-open(동일 근거 — pullim 모드는 introspection 이 유일 검증선).
    return { user: null, unavailable: true };
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
