// same-origin 요청 검증 — billing/notify 라우트의 1차 CSRF 가드를 재사용 형태로.
// 근거: proc/plan/2026-05-29_auth-login-signup.md, Codex review(auth same-origin 부재).
//
// 브라우저는 cross-origin POST 에 Origin 헤더를 붙인다. Origin/Referer 가 허용 origin 과
// 불일치하면 거부. (헤더 spoof 가능성은 CSRF 토큰이 2차로 막는다.)
// 비브라우저 클라이언트(Origin/Referer 모두 없음)는 거부 — auth 라우트는 브라우저 전용.

function collectAllowedOrigins(request: Request): Set<string> {
  const set = new Set<string>();
  const explicit = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (explicit) set.add(explicit.replace(/\/$/, ""));
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) set.add(`https://${vercelUrl}`);
  // request.url(=Host 기반) origin 은 **dev 에서만** 신뢰. production 에서 이를 허용하면
  // 프록시가 Host 를 그대로 전달할 때 공격자가 Host+Origin 을 임의 도메인으로 맞춰 가드를
  // 통과할 수 있다(fail-open). prod 는 명시 allowlist(NEXT_PUBLIC_SITE_ORIGIN/VERCEL_URL)만
  // 신뢰 → 미설정 시 fail-closed(403). 커스텀 도메인은 .env.example 대로 명시 설정 필요.
  if (process.env.NODE_ENV !== "production") {
    try {
      set.add(new URL(request.url).origin);
    } catch {
      // request.url 파싱 실패는 거의 없음.
    }
  }
  return set;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return false;
  const allowed = collectAllowedOrigins(request);
  if (origin) return allowed.has(origin);
  try {
    return allowed.has(new URL(referer!).origin);
  } catch {
    return false;
  }
}
