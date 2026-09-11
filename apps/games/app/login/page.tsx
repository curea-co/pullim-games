import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { PULLIM_MODE, PULLIM_LOGIN_ORIGIN } from "@/lib/auth/pullim-mode";
import { getRequestOrigin } from "@/lib/request-origin";

export const metadata: Metadata = { title: "로그인 · 풀림 게임즈" };

export default async function LoginPage() {
  // pullim 모드: 자체 로그인 폼 dormant → pullim-web 로 서버 redirect(SSR/no-JS 동작).
  // ⚠️ next = **실제 요청 origin**(`getRequestOrigin` — headers() Host)의 홈(고정).
  //    canonical `getSiteUrl` 은 로컬 SSO(`games.pullim.local`)·preview alias 에서 현재 호스트를
  //    잃어 다른 origin 으로 복귀(Codex #141) → 실제 요청 호스트 보존. `/login` self-loop 방지 겸.
  //    (headers() 호출은 pullim 분기에서만 — legacy 는 정적 유지.)
  if (PULLIM_MODE) {
    const origin = await getRequestOrigin();
    redirect(`${PULLIM_LOGIN_ORIGIN}/login?next=${encodeURIComponent(`${origin}/home`)}`);
  }
  return <AuthForm mode="login" />;
}
