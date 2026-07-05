// 자체 로그인/가입 페이지(`/login`·`/signup`) dormant 가드 — pullim 모드에서 games 자체 auth UI 를
// 표면 제거한다(spec/05 §5.2·§5.6 "가입·본인인증 권위 중앙 이동", plan PR-1).
// CTA(AuthCta) 는 진입 링크를 pullim-web 으로 돌리지만, stale 북마크·수동 URL 로 직접 `/login`·
// `/signup` 진입하는 경로가 남는다 → 페이지 단에서 pullim 모드면 pullim-web 로 하드 리다이렉트.
// legacy 모드는 children(AuthForm) 그대로 렌더.
"use client";

import { useEffect } from "react";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";
import { gotoPullimAuth } from "@/lib/auth/login-redirect";

export function AuthRouteGuard({
  kind,
  children,
}: {
  kind: "login" | "signup";
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (PULLIM_MODE) gotoPullimAuth(kind); // cross-origin 하드 내비(현재 URL→next)
  }, [kind]);

  // pullim 모드: 리다이렉트 중 — dormant 폼이 깜빡이지 않게 아무것도 렌더하지 않는다.
  if (PULLIM_MODE) return null;
  return <>{children}</>;
}
