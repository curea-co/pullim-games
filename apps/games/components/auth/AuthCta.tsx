// 로그인·회원가입 진입 CTA — 단일 진입점(신규 로컬 링크 산개 방지, Codex #140).
// legacy 모드: 로컬 `/login`·`/signup` 라우트로 next/link 네비게이션(현행 무변경).
// pullim 모드: pullim-web `/login`·/signup 으로 cross-origin 하드 내비게이션(회원 경로 중앙 위임,
//   spec/05 §5.2). 로컬 auth 라우트는 pullim 모드에서 dormant 라 여기로 새면 빈 화면 → 진입 차단.
// plan: proc/plan/2026-07-03_games-unified-login-os-delegation.md PR-1(진입점 전수).
"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";
import { gotoPullimAuth, pullimAuthHref } from "@/lib/auth/login-redirect";

type Props = {
  kind: "login" | "signup";
  className?: string;
  style?: CSSProperties;
  /** 클릭 시 부수 동작(예: 메뉴 닫기). pullim/legacy 공통 실행. */
  onNavigate?: () => void;
  children: ReactNode;
  "aria-label"?: string;
  /** data-* 통과(예: data-cta-priority — UI audit 마킹). */
  [dataAttr: `data-${string}`]: string | undefined;
};

export function AuthCta({ kind, className, style, onNavigate, children, ...rest }: Props) {
  const localPath = kind === "login" ? "/login" : "/signup";

  if (PULLIM_MODE) {
    // href = SSR/no-JS 폴백(pullim-web 인증 URL, next 없음). 클릭 시 현재 URL 을 next 로 붙여 정밀 복귀.
    return (
      <a
        href={pullimAuthHref(kind)}
        className={className}
        style={style}
        onClick={(e) => {
          e.preventDefault();
          onNavigate?.();
          gotoPullimAuth(kind);
        }}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={localPath} className={className} style={style} onClick={onNavigate} {...rest}>
      {children}
    </Link>
  );
}
