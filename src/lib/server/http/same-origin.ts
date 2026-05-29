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
  try {
    set.add(new URL(request.url).origin);
  } catch {
    // request.url 파싱 실패는 거의 없음.
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
