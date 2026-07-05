import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { PULLIM_MODE, PULLIM_LOGIN_ORIGIN } from "@/lib/auth/pullim-mode";
import { gamesUrl } from "@/lib/os/urls";

export const metadata: Metadata = { title: "로그인 · 풀림 게임즈" };

export default function LoginPage() {
  // pullim 모드: 자체 로그인 폼 dormant → pullim-web 로 서버 redirect(SSR/no-JS 동작).
  // ⚠️ next = games 홈(고정 목적지) — 현재 `/login` URL 을 next 로 두면 로그인 후 다시 `/login`
  //    복귀 → dormant → 무한 bounce(Codex #141). 실제 목적지로 강제.
  if (PULLIM_MODE) {
    redirect(`${PULLIM_LOGIN_ORIGIN}/login?next=${encodeURIComponent(`${gamesUrl()}/home`)}`);
  }
  return <AuthForm mode="login" />;
}
