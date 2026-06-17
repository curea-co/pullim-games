import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "회원가입 · 풀림 게임즈" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
