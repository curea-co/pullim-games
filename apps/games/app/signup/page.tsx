import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { PULLIM_MODE, PULLIM_LOGIN_ORIGIN } from "@/lib/auth/pullim-mode";
import { gamesUrl } from "@/lib/os/urls";

export const metadata: Metadata = { title: "회원가입 · 풀림 게임즈" };

export default function SignupPage() {
  // pullim 모드: 자체 가입 폼 dormant → pullim-web 로 서버 redirect(SSR/no-JS 동작).
  // next = games 홈(고정) — `/signup` self-loop 방지(Codex #141).
  if (PULLIM_MODE) {
    redirect(`${PULLIM_LOGIN_ORIGIN}/signup?next=${encodeURIComponent(`${gamesUrl()}/home`)}`);
  }
  return <AuthForm mode="signup" />;
}
