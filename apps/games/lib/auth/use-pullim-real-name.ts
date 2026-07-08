// 프로필 라벨 전용 실명(auth /me.name) 비차단 조회 훅.
// 근거: 핸드오프 2026-07-08_...profile-realname(프로필 라벨에 한해 /me.name), Codex #153.
//
// ⚠️ 회원 정밀 게이트(getAuthState/useIdentity)와 **분리**한다 — 실명은 표시용 best-effort 이므로
//    게이트·헤더 렌더를 이 조회 지연에 묶지 않는다. enabled(회원 확정) 일 때만 1회 조회하고,
//    응답이 오면 라벨이 실명으로 갱신된다(오기 전엔 호출부가 displayName 폴백을 쓴다).
"use client";

import { useEffect, useState } from "react";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";
import { fetchPullimRealName } from "@/lib/auth/client";

/** @param enabled pullim 회원 확정 시에만 조회(게스트·legacy·미확정은 no-op). */
export function usePullimRealName(enabled: boolean): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!PULLIM_MODE || !enabled) {
      setName(null);
      return;
    }
    let cancelled = false;
    fetchPullimRealName().then((n) => {
      if (!cancelled) setName(n);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return name;
}
