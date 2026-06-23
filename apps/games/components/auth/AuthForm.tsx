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
import { Checkbox } from "@/components/ui/checkbox";
import { authErrorMessage, login, signup } from "@/lib/auth/client";
import { GRADES, clearPlayer, type Grade } from "@/lib/core/player";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [over14, setOver14] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isSignup && grade === "") {
      setError("학년을 선택해주세요.");
      return;
    }
    if (isSignup && !over14) {
      setError("만 14세 이상만 가입할 수 있어요.");
      return;
    }
    setPending(true);
    const result = isSignup
      ? await signup(email, password, over14, grade as Grade)
      : await login(email, password);
    setPending(false);

    if (result.ok) {
      // 로그인/가입 성공 = 회원 신원 확정 → 게스트 **프로필/쿠키만** 정리(clearPlayer).
      // ⚠️ 학습 데이터(fingerprint·SRS·스트릭·활동)는 **보존**한다(Codex #114 R6 — R5↔R6 진동 해소):
      //   spec/05 §5.2가 승급 시 fingerprint 연결을 약속하고 학습 데이터는 아직 localStorage
      //   전용이므로, 방금 로그인한 사용자의 데이터를 즉시 삭제하면 안 된다. 공용 기기 핸드오프의
      //   전체 삭제는 명시적 "나가기"(resetGuestSession, 확인 UI 동반)에서만 한다.
      clearPlayer();
      router.push("/home");
      router.refresh();
      return;
    }
    setError(authErrorMessage(result.error, result.status));
  }

  return (
    // spec/08 §8.3·§8.7: 모바일 가장자리 패딩 24px(px-6), 컨텐츠 폭 480px.
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[480px] items-center px-6">
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
              // 중등 타겟 — 가입 시 학년 수집(StartForm 게스트 경로와 동일). spec/08 §8.10 토큰·focus ring.
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="grade" className="text-pullim-slate-700">
                  학년
                </Label>
                <select
                  id="grade"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as Grade)}
                  className="h-10 rounded-md border border-pullim-slate-300 bg-card px-3 text-sm text-pullim-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-positive"
                >
                  <option value="" disabled>
                    학년 선택
                  </option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isSignup && (
              // spec/08 §8.10: 토큰화 + focus ring + 44×44 터치 영역(min-h-11 행 + 라벨 클릭).
              <div className="flex min-h-11 items-start gap-2 py-1">
                <Checkbox
                  id="over14"
                  checked={over14}
                  onCheckedChange={(v) => setOver14(v === true)}
                  className="mt-0.5 h-5 w-5"
                />
                <Label
                  htmlFor="over14"
                  className="text-sm font-normal leading-snug text-pullim-slate-700"
                >
                  만 14세 이상이며, 이메일·비밀번호와 기기 식별값(fingerprint) 저장에
                  동의해요.
                </Label>
              </div>
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
                {/* 보조 네비 링크 — 1차 CTA(가입/로그인 버튼) 아님. 작은 뷰포트에서 폼 아래로
                    자연 스크롤되는 게 정상이라 UI audit informational(스크롤 OK)로 표시. */}
                <Link
                  href="/login"
                  data-cta-priority="informational"
                  className="text-pullim-blue-600 underline"
                >
                  로그인
                </Link>
              </>
            ) : (
              <>
                계정이 없나요?{" "}
                <Link
                  href="/signup"
                  data-cta-priority="informational"
                  className="text-pullim-blue-600 underline"
                >
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
