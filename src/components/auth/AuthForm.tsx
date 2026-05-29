"use client";

// 로그인/회원가입 공용 폼. 근거: proc/plan/2026-05-29_auth-login-signup.md.
// 4 viewport audit 의무 대상 (CONVENTION §8) — 머지 전 `bun run ui:audit` 첨부.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authErrorMessage, login, signup } from "@/lib/auth/client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [over14, setOver14] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isSignup && !over14) {
      setError("만 14세 이상만 가입할 수 있어요.");
      return;
    }
    setPending(true);
    const result = isSignup
      ? await signup(email, password, over14)
      : await login(email, password);
    setPending(false);

    if (result.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setError(authErrorMessage(result.error, result.status));
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-sm items-center px-4">
      {/* 디자인 시스템 토큰 정합(AGENTS.md/spec/08): pullim-* 색, 블록 radius 4px. */}
      <Card className="w-full rounded border-pullim-slate-200 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-pullim-slate-900">
            {isSignup ? "회원가입" : "로그인"}
          </CardTitle>
          <CardDescription className="text-pullim-slate-500">
            {isSignup
              ? "계정을 만들면 로그인 정보가 저장돼요. (학습 기록의 기기 간 동기화는 준비 중이에요.)"
              : "다시 오셨네요. 계속 이어가요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-pullim-slate-700">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-pullim-slate-300"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-pullim-slate-700">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-pullim-slate-300"
              />
              {isSignup && (
                <p className="text-type-secondary text-xs">8자 이상, 영문과 숫자 포함</p>
              )}
            </div>

            {isSignup && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={over14}
                  onChange={(e) => setOver14(e.target.checked)}
                />
                <span>만 14세 이상이며, 이메일·비밀번호 저장에 동의해요.</span>
              </label>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "처리 중…" : isSignup ? "가입하기" : "로그인"}
            </Button>
          </form>

          <p className="text-type-secondary mt-4 text-center text-sm">
            {isSignup ? (
              <>
                이미 계정이 있나요?{" "}
                <Link href="/login" className="text-pullim-blue-600 underline">
                  로그인
                </Link>
              </>
            ) : (
              <>
                계정이 없나요?{" "}
                <Link href="/signup" className="text-pullim-blue-600 underline">
                  회원가입
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
