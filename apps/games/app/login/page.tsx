import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { PULLIM_MODE, PULLIM_LOGIN_ORIGIN } from "@/lib/auth/pullim-mode";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "로그인 · 풀림 게임즈" };

export default function LoginPage() {
  // pullim 모드: 자체 로그인 폼 dormant → pullim-web 로 서버 redirect(SSR/no-JS 동작).
  // ⚠️ next = **games 자기 origin**(`getSiteUrl` — prod/dev/preview VERCEL_URL 정합, site-url SoT).
  //    sibling `gamesUrl()`(env 추정) 은 preview/로컬에서 현재 origin 보존 못 함(Codex #141).
  //    또 next 는 games 홈(고정) — `/login` self-loop 방지.
  if (PULLIM_MODE) {
    redirect(`${PULLIM_LOGIN_ORIGIN}/login?next=${encodeURIComponent(`${getSiteUrl()}/home`)}`);
  }
  return <AuthForm mode="login" />;
}
