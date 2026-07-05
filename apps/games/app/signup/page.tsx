import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { PULLIM_MODE, PULLIM_LOGIN_ORIGIN } from "@/lib/auth/pullim-mode";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "회원가입 · 풀림 게임즈" };

export default function SignupPage() {
  // pullim 모드: 자체 가입 폼 dormant → pullim-web 로 서버 redirect(SSR/no-JS 동작).
  // next = **games 자기 origin**(`getSiteUrl` site-url SoT)의 홈(고정) — sibling `gamesUrl()`
  //   preview/로컬 origin 미보존 회피 + `/signup` self-loop 방지(Codex #141).
  if (PULLIM_MODE) {
    redirect(`${PULLIM_LOGIN_ORIGIN}/signup?next=${encodeURIComponent(`${getSiteUrl()}/home`)}`);
  }
  return <AuthForm mode="signup" />;
}
