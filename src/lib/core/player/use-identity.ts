"use client";

// 입구 신원 판정 훅 — 게스트 프로필(localStorage) OR 로그인 계정 중 하나라도 있으면 "입장" 상태.
// plan: proc/plan/2026-06-01_arcade-entry-model.md. 게이트(/home·플레이)·랜딩 리다이렉트에 사용.

import { useEffect, useState } from "react";
import { getPlayer, type Player } from "@/lib/core/player";
import { getMe, type AuthUser } from "@/lib/auth/client";

export type Identity = {
  /** 클라이언트 mount + 판정 완료. false 동안은 게이트 결정을 미룬다(깜빡임·오판 방지). */
  ready: boolean;
  player: Player | null;
  authUser: AuthUser | null;
  /** 게스트 프로필 또는 로그인 계정 보유. */
  hasIdentity: boolean;
};

export function useIdentity(): Identity {
  const [state, setState] = useState<Identity>({
    ready: false,
    player: null,
    authUser: null,
    hasIdentity: false,
  });

  useEffect(() => {
    let cancelled = false;
    const player = getPlayer(); // localStorage — 동기
    getMe()
      .catch(() => null)
      .then((authUser) => {
        if (cancelled) return;
        setState({
          ready: true,
          player,
          authUser,
          hasIdentity: Boolean(player) || Boolean(authUser),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
