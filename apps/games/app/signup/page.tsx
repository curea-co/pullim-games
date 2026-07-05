import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { PULLIM_MODE, PULLIM_LOGIN_ORIGIN } from "@/lib/auth/pullim-mode";
import { getRequestOrigin } from "@/lib/request-origin";

export const metadata: Metadata = { title: "회원가입 · 풀림 게임즈" };

export default async function SignupPage() {
  // pullim 모드: 자체 가입 폼 dormant → pullim-web 로 서버 redirect(SSR/no-JS 동작).
  // next = **실제 요청 origin**(`getRequestOrigin` headers() Host)의 홈(고정) — canonical origin
  //   대신 로컬 SSO/preview alias 실제 호스트 보존 + `/signup` self-loop 방지(Codex #141).
  if (PULLIM_MODE) {
    const origin = await getRequestOrigin();
    redirect(`${PULLIM_LOGIN_ORIGIN}/signup?next=${encodeURIComponent(`${origin}/home`)}`);
  }
  return <AuthForm mode="signup" />;
}
