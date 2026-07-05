import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthRouteGuard } from "@/components/auth/AuthRouteGuard";

export const metadata: Metadata = { title: "회원가입 · 풀림 게임즈" };

export default function SignupPage() {
  return (
    <AuthRouteGuard kind="signup">
      <AuthForm mode="signup" />
    </AuthRouteGuard>
  );
}
