// 재사용 가능한 CSRF 헬퍼 — **stateless double-submit 쿠키** 방식.
// 근거: proc/plan/2026-05-29_auth-login-signup.md, Codex review(auth CSRF 부재).
//
// 왜 in-memory nonce store 가 아닌가:
// - 토큰 발급 엔드포인트(GET /api/auth/csrf)와 검증 엔드포인트(POST /api/auth/*)는
//   서버리스에서 **별개 함수 = 메모리 비공유**라, 발급 토큰을 검증 쪽 in-memory store
//   가 찾지 못한다(dev 에서도 라우트별 모듈 분리로 재현). → 서버 상태 없는 방식 필요.
//
// double-submit 동작:
// - GET 가 랜덤 토큰을 쿠키로 set (Path=/, SameSite=Strict, non-HttpOnly — 클라가 읽어야 함).
// - 클라가 쿠키 값을 읽어 POST 헤더 `x-csrf-token` 으로 echo.
// - 서버는 쿠키 토큰 == 헤더 토큰(constant-time)만 검사. 서버 저장 불필요.
//
// 보안 근거:
// - 크로스오리진 공격자는 (a) 피해자 쿠키를 읽을 수 없고(SOP), (b) 커스텀 헤더
//   `x-csrf-token` 을 단순 폼 POST 로 못 붙이며(커스텀 헤더는 CORS preflight 유발 →
//   서버가 미허용), (c) SameSite=Strict 라 쿠키도 크로스사이트 미동봉. 따라서 일치 불가.
// - same-origin(Origin/Referer) 가드가 1차, 본 토큰이 2차 방어(다층).
import { randomBytes, timingSafeEqual } from "node:crypto";

export interface CsrfHelper {
  readonly cookieName: string;
  issue(opts?: { isProduction?: boolean }): { token: string; cookieHeader: string };
  readCookieToken(cookieHeader: string | null | undefined): string | null;
  /** 쿠키 토큰과 헤더 토큰이 일치하면 true (double-submit). */
  verify(cookieToken: string | null | undefined, headerToken: string | null | undefined): boolean;
}

export function createCsrf(config: { cookieName: string; ttlMs?: number }): CsrfHelper {
  const ttl = config.ttlMs ?? 60 * 60 * 1000;

  return {
    cookieName: config.cookieName,

    issue(opts = {}) {
      const isProduction = opts.isProduction ?? process.env.NODE_ENV === "production";
      const token = randomBytes(32).toString("hex"); // 64 hex chars
      const parts = [
        `${config.cookieName}=${token}`,
        "Path=/", // 페이지 JS 가 읽고( double-submit) + 모든 라우트에 동봉되도록.
        "SameSite=Strict",
        `Max-Age=${Math.floor(ttl / 1000)}`,
      ];
      // double-submit 이라 HttpOnly 미설정(클라가 읽어 헤더로 echo). SameSite=Strict + 커스텀
      // 헤더 요구가 실질 방어. XSS 는 모든 CSRF 방어를 무력화하므로 별도 위협 모델.
      if (isProduction) parts.push("Secure");
      return { token, cookieHeader: parts.join("; ") };
    },

    readCookieToken(cookieHeader) {
      if (!cookieHeader) return null;
      for (const pair of cookieHeader.split(";")) {
        const eq = pair.indexOf("=");
        if (eq === -1) continue;
        if (pair.slice(0, eq).trim() !== config.cookieName) continue;
        const value = pair.slice(eq + 1).trim();
        return value || null;
      }
      return null;
    },

    verify(cookieToken, headerToken) {
      if (!cookieToken || !headerToken) return false;
      // 형식 위조 차단(hex 64자) + 길이 동일성 보장 후 constant-time 비교.
      if (cookieToken.length !== 64 || !/^[0-9a-f]+$/i.test(cookieToken)) return false;
      if (headerToken.length !== cookieToken.length) return false;
      try {
        return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
      } catch {
        return false;
      }
    },
  };
}
