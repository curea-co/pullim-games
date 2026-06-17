"use client";

// 헤더 우측 인증 진입점 — 비로그인이면 "로그인" 링크, 로그인 상태면 계정 칩 + 로그아웃.
// 근거: proc/plan/2026-05-29_auth-login-signup.md, Codex review(진입점 부재 지적).
// 모든 뷰포트에서 노출(모바일 포함) — URL 직접 입력 없이도 계정 기능 도달 가능.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getMe, logout, type AuthUser } from "@/lib/auth/client";

export function AuthMenu() {
  const router = useRouter();
  // AppShell 이 루트 레이아웃에 고정돼 라우트 이동 시 AuthMenu 가 언마운트되지 않는다.
  // pathname 을 deps 에 넣어 /login -> / 이동(로그인 성공) 등 경로 변화마다 재조회 →
  // 헤더 로그인/로그아웃 상태가 갱신된다(hard refresh 없이).
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe().then((u) => {
      if (alive) {
        setUser(u);
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
      setUser(await getMe());
    }
    setBusy(false);
    router.refresh();
  }

  // 첫 렌더(로드 전)는 레이아웃 시프트 방지용 자리만 차지.
  if (!loaded) {
    return <span aria-hidden className="inline-block h-9 w-16" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900"
      >
        로그인
      </Link>
    );
  }

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
        className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900 disabled:opacity-50"
      >
        {busy ? "…" : "로그아웃"}
      </button>
    </div>
  );
}
