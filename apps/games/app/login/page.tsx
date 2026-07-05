import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthRouteGuard } from "@/components/auth/AuthRouteGuard";

export const metadata: Metadata = { title: "로그인 · 풀림 게임즈" };

export default function LoginPage() {
  return (
    <AuthRouteGuard kind="login">
      <AuthForm mode="login" />
    </AuthRouteGuard>
  );
}
