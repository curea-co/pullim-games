"use client";

// 헤더 우측 인증 진입점 — 비로그인이면 "로그인" 링크, 로그인 상태면 계정 칩 + 로그아웃.
// 근거: proc/plan/2026-05-29_auth-login-signup.md, Codex review(진입점 부재 지적).
// 모든 뷰포트에서 노출(모바일 포함) — URL 직접 입력 없이도 계정 기능 도달 가능.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAuthState, logout, type AuthUser } from "@/lib/auth/client";
import { getPlayer, resetGuestSession, type Player } from "@/lib/core/player";

export function AuthMenu() {
  const router = useRouter();
  // AppShell 이 루트 레이아웃에 고정돼 라우트 이동 시 AuthMenu 가 언마운트되지 않는다.
  // pathname 을 deps 에 넣어 /login -> / 이동(로그인 성공) 등 경로 변화마다 재조회 →
  // 헤더 로그인/로그아웃 상태가 갱신된다(hard refresh 없이).
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  // auth 백엔드 미확정(503/네트워크) — 게이트는 fail-open 하므로, 헤더도 "로그인" 단정 대신
  // 중립 상태를 보인다(Codex #114 R3: 게이트와 헤더 판정 불일치 차단).
  const [unavailable, setUnavailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setPlayer(getPlayer()); // 게스트 프로필(동기)
    getAuthState().then(({ user: u, unavailable: un }) => {
      if (alive) {
        setUser(u);
        setUnavailable(un);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  async function onLogout() {
    setBusy(true);
    const ok = await logout();
    if (ok) {
      setUser(null);
    } else {
      // 로그아웃 실패(네트워크·403·500): 세션이 남아있을 수 있으므로 실제 상태로 복구.
      const st = await getAuthState();
      setUser(st.user);
      setUnavailable(st.unavailable);
    }
    setBusy(false);
    router.refresh();
  }

  // 게스트 나가기 / 다른 사용자로 시작 — 이 기기의 게스트 신원 + fingerprint 기반 로컬 진행도
  // (SRS·스트릭·활동·커스텀)를 **전부 삭제**한다(Codex #114 R2·R4). 파괴적이므로 확인 1회를
  // 받는다(R6: 모바일 오탭 영구삭제 방지).
  function onGuestExit() {
    const ok = window.confirm(
      "이 기기의 게스트 학습 기록(진행도·스트릭·커스텀 카드)을 모두 지우고 나갈까요? 되돌릴 수 없어요.",
    );
    if (!ok) return;
    resetGuestSession();
    setPlayer(null);
    router.push("/");
    router.refresh();
  }

  // 첫 렌더(로드 전)는 레이아웃 시프트 방지용 자리만 차지.
  if (!loaded) {
    return <span aria-hidden className="inline-block h-11 w-16" />;
  }

  // auth 미확정(게스트도 없음) — 로그아웃/로그인 어느 쪽도 단정 불가. 중립 placeholder.
  if (!user && !player && unavailable) {
    return <span aria-hidden className="inline-block h-11 w-16" />;
  }

  // 회원도 게스트도 아니고 확정됨 → 로그인 진입(주로 랜딩).
  if (!user && !player) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900"
      >
        로그인
      </Link>
    );
  }

  // 게스트(비로그인 + 프로필) — 닉네임 + "나가기"(다른 사용자로 시작).
  if (!user && player) {
    return (
      <div className="flex items-center gap-1">
        <span className="hidden max-w-[8rem] truncate text-xs font-medium text-pullim-slate-500 sm:inline">
          {player.nickname} (게스트)
        </span>
        <button
          type="button"
          onClick={onGuestExit}
          title="이 기기의 게스트 학습 기록을 모두 지우고 나갑니다"
          className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-accent-negative hover:bg-pullim-slate-100"
        >
          기록 지우고 나가기
        </button>
      </div>
    );
  }

  // 회원 — 이메일 + 로그아웃. (위 가드들로 여기선 user 비-null 보장.)
  if (!user) return null;
  return (
    <div className="flex items-center gap-1">
      <span
        className="hidden max-w-[10rem] truncate text-xs font-medium text-pullim-slate-500 sm:inline"
        title={user.email}
      >
        {user.email}
      </span>
      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900 disabled:opacity-50"
      >
        {busy ? "…" : "로그아웃"}
      </button>
    </div>
  );
}
