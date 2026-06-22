"use client";

// 입구 신원 판정 훅 — 게스트 프로필(localStorage) OR 로그인 계정 중 하나라도 있으면 "입장" 상태.
// plan: proc/plan/2026-06-01_arcade-entry-model.md. 게이트(/home·플레이)·랜딩 리다이렉트에 사용.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getPlayer, type Player } from "@/lib/core/player";
import { getAuthState, type AuthUser } from "@/lib/auth/client";

export type Identity = {
  /** 클라이언트 mount + 판정 완료. false 동안은 게이트 결정을 미룬다(깜빡임·오판 방지). */
  ready: boolean;
  player: Player | null;
  authUser: AuthUser | null;
  /** auth 백엔드 미가용(503/네트워크) — 회원 여부 미확정. */
  authUnavailable: boolean;
  /** 확정 신원(게스트 프로필 OR 로그인 계정). 랜딩→/home 리다이렉트 판정용. */
  hasDefiniteIdentity: boolean;
  /** 게이트 통과 여부 = 확정 신원 OR auth 미확정(fail-open: 회원일 수 있으니 안 튕김). */
  hasIdentity: boolean;
};

export function useIdentity(): Identity {
  const pathname = usePathname();
  const [state, setState] = useState<Identity>({
    ready: false,
    player: null,
    authUser: null,
    authUnavailable: false,
    hasDefiniteIdentity: false,
    hasIdentity: false,
  });

  // pathname 을 deps 에 넣어 네비게이션(예: 로그아웃 후 router.refresh→이동)마다 재판정한다.
  // 그러지 않으면 hasIdentity 가 stale 하게 남아 보호 라우트가 계속 열려 있을 수 있다(Codex #114 R1).
  useEffect(() => {
    let cancelled = false;
    const player = getPlayer(); // localStorage — 동기

    // 게스트 신원은 네트워크 비종속(spec/05 §5.2 "게스트 신원으로 즉시 입장"):
    // player 가 있으면 auth 응답을 기다리지 않고 즉시 ready·입장 판정. 오프라인·지연에도 막히지 않음.
    if (player) {
      setState({
        ready: true,
        player,
        authUser: null,
        authUnavailable: false,
        hasDefiniteIdentity: true,
        hasIdentity: true,
      });
    }

    // 계정 신원은 비동기로 판정. auth 백엔드 장애(503/네트워크)는 "미확정"으로 구분(Codex #114 R2):
    // 세션 쿠키 살아있는 회원이 일시 장애로 게이트에서 튕기지 않도록 fail-open.
    getAuthState().then(({ user, unavailable }) => {
      if (cancelled) return;
      const definite = Boolean(player) || Boolean(user);
      setState({
        ready: true,
        player,
        authUser: user,
        authUnavailable: unavailable,
        hasDefiniteIdentity: definite,
        hasIdentity: definite || unavailable,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return state;
}
