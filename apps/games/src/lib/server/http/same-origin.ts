// same-origin 요청 검증 — billing/notify 라우트의 1차 CSRF 가드를 재사용 형태로.
// 근거: proc/plan/2026-05-29_auth-login-signup.md, Codex review(auth same-origin 부재).
//
// 브라우저는 cross-origin POST 에 Origin 헤더를 붙인다. Origin/Referer 가 허용 origin 과
// 불일치하면 거부. (헤더 spoof 가능성은 CSRF 토큰이 2차로 막는다.)
// 비브라우저 클라이언트(Origin/Referer 모두 없음)는 거부 — auth 라우트는 브라우저 전용.

function collectAllowedOrigins(request: Request): Set<string> {
  const set = new Set<string>();
  // 1) 명시 allowlist(있으면) — 커스텀 도메인/프록시 운영 보강.
  const explicit = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (explicit) set.add(explicit.replace(/\/$/, ""));
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) set.add(`https://${vercelUrl}`);
  // 2) 요청 자신의 origin(Host 기반) — "Origin == 요청이 들어온 Host" 는 정상 same-origin
  //    의 정의 그 자체다. env 미설정이어도 정상 same-site POST 를 막지 않도록 항상 허용.
  //    (billing/notify 와 동일 패턴.) Host-spoof 우려는 별도 **CSRF double-submit 토큰**이
  //    백스톱 — 크로스오리진 공격자는 쿠키/토큰을 맞출 수 없으므로 Host 만 위조해도 통과 못함.
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
