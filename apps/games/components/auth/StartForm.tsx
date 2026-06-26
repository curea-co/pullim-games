"use client";

// 게스트 온보딩 폼 — 닉네임+학년으로 게스트 신원 생성(회원가입 없음).
// plan: proc/plan/2026-06-01_arcade-entry-model.md. 4 viewport audit 대상.
// 이미 신원(게스트/회원) 있으면 /home 으로.

import { useEffect, useState } from "react";
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
import { GRADES, createPlayer, validateNickname, type Grade } from "@/lib/core/player";
import { useIdentity } from "@/lib/core/player/use-identity";

export function StartForm() {
  const router = useRouter();
  const { ready, hasIdentity } = useIdentity();
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 신원 있으면 온보딩 건너뜀.
  useEffect(() => {
    if (ready && hasIdentity) router.replace("/home");
  }, [ready, hasIdentity, router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nameRes = validateNickname(nickname);
    if (!nameRes.ok) {
      setError(nameRes.error);
      return;
    }
    if (grade === "") {
      setError("학년을 선택해주세요.");
      return;
    }
    if (!consent) {
      setError("동의가 필요해요. (만 14세 이상이거나 보호자 동의)");
      return;
    }
    // createPlayer 가 localStorage 영속에 실패하면 null → 게이트가 무신원으로 되돌려 무한루프(Codex #114 R1).
    // 실패 시 리다이렉트하지 않고 명확히 안내한다.
    const created = createPlayer(nameRes.value, grade, consent);
    if (!created) {
      setError(
        "이 브라우저에 기록을 저장할 수 없어요(시크릿 모드 등). 저장 허용 후 다시 시도하거나, 회원가입을 이용해주세요.",
      );
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    // spec/08 §8.3·§8.7: 모바일 가장자리 24px(px-6), 컨텐츠 폭 480px.
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[480px] items-center px-6">
      <Card className="w-full rounded border-pullim-slate-200 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-pullim-slate-900">게스트로 시작</CardTitle>
          <CardDescription className="text-pullim-slate-500">
            닉네임과 학년만 있으면 바로 시작해요. 가입은 필요 없어요. (이 기기에 기록이 저장돼요.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nickname" className="text-pullim-slate-700">
                닉네임
              </Label>
              <Input
                id="nickname"
                autoComplete="nickname"
                maxLength={12}
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="border-pullim-slate-300"
                placeholder="12자 이내"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grade" className="text-pullim-slate-700">
                학년
              </Label>
              <select
                id="grade"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade)}
                className="h-11 rounded-md border border-pullim-slate-300 bg-card px-3 text-sm text-pullim-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-positive"
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

            <div className="flex min-h-11 items-start gap-2 py-1">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5 h-5 w-5"
              />
              <Label
                htmlFor="consent"
                className="text-sm font-normal leading-snug text-pullim-slate-700"
              >
                <strong>만 14세 이상</strong>이거나, 만 14세 미만이라면{" "}
                <strong>보호자 동의를 받았어요.</strong> (학년 정보와 함께 저장돼요.)
              </Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full">
              시작하기
            </Button>
          </form>

          <p className="text-type-secondary mt-4 text-center text-sm">
            기록을 안전하게 저장하고 싶나요?{" "}
            <Link href="/signup" className="text-pullim-blue-600 underline">
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
