"use client";

// 입구 게이트 — 신원(게스트 프로필 OR 로그인) 없으면 랜딩(/)으로 돌려보낸다.
// plan: proc/plan/2026-06-01_arcade-entry-model.md. /home·게임 플레이 진입에 적용.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "@/lib/core/player/use-identity";
import { PullimMark } from "@/components/brand/PullimMark";

export function RequireIdentity({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, hasIdentity } = useIdentity();

  useEffect(() => {
    if (ready && !hasIdentity) router.replace("/");
  }, [ready, hasIdentity, router]);

  // 판정 전 / 무신원(리다이렉트 중) — 컨텐츠 노출 안 함.
  if (!ready || !hasIdentity) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-hidden="true">
        <PullimMark className="h-10 w-10 animate-pulse" />
      </div>
    );
  }
  return <>{children}</>;
}
