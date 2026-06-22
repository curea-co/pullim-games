// /api/billing/notify/csrf — round 10 fix #1 (Codex 지적 #1).
// SPEC §05.7.5 외부 메일 서비스 위임 정책 — same-origin 가드 강화.
//
// 책임:
//   GET 요청 시 SameSite=Strict + HttpOnly 쿠키로 1회용 CSRF nonce 발급.
//   본 라우트는 브라우저 form 만 호출 가능 — 비브라우저 클라이언트는 쿠키 jar 격리상
//   쿠키를 받아도 후속 POST 에 자동 동봉되지 않거나, 동봉되더라도 SameSite=Strict
//   가 cross-site 호출 자체를 차단한다.
//
// 응답:
//   GET  200 + Set-Cookie 헤더 + body { ok: true }
//   POST 405 method_not_allowed (본 엔드포인트는 GET 만 허용)
//
// 보안 속성:
//   - SameSite=Strict: cross-origin POST 에서 쿠키 미동봉
//   - HttpOnly: JS 접근 차단 (XSS 토큰 누수 차단)
//   - Secure (production): HTTPS 외 전송 차단
//   - Path=/api/billing/notify: 다른 라우트엔 쿠키 미동봉
//   - 1시간 만료 + 1회 소비: replay 차단

import { NextResponse } from "next/server";
import { issueBillingNotifyCsrfToken } from "@/lib/server/billing/csrf";

export async function GET() {
  const issued = issueBillingNotifyCsrfToken();
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.headers.set("set-cookie", issued.cookieHeader);
  // 캐시 0 — 매 요청마다 새 토큰 발급.
  res.headers.set("cache-control", "no-store");
  return res;
}

export async function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
