import type { Metadata } from "next";
import { StartForm } from "@/components/auth/StartForm";

export const metadata: Metadata = { title: "게스트로 시작 · 풀림 게임즈" };

export default function StartPage() {
  return <StartForm />;
}
