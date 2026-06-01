// 풀림 게임즈 상단 헤더.
// pullim-study-demo AppHeader 의 simplified 버전 — V0.4 시점에는 검색·알림·프로필
// 같은 우측 액션은 placeholder 만 (잠금 표시). 햄버거(모바일) + 로고만 동작.
//
// variant:
// - "default": 햄버거 + 로고 + 검색/알림/프로필 placeholder
// - "game": 게임 페이지 minimal — ✕ (게임 허브로 복귀) + 로고만. 검색/알림/프로필 제거.
//   근거: proc/plan/2026-05-11_layout-overhaul.md F2=B.

import Link from "next/link";
import { ArrowLeft, Bell, Search } from "lucide-react";
import { MobileDrawer } from "./mobile-drawer";
import { AuthMenu } from "@/components/auth/AuthMenu";
import type { Role } from "./nav-config";

interface Props {
  role: Role;
  variant?: "default" | "game";
}

export function AppHeader({ role, variant = "default" }: Props) {
  const isGame = variant === "game";

  return (
    <header className="sticky top-0 z-30 border-b border-pullim-slate-200 bg-card/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        {/* 게임 모드: ✕(게임 허브로 복귀). default: 모바일 햄버거 */}
        {isGame ? (
          <Link
            href="/games"
            aria-label="게임 허브로 돌아가기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-pullim-slate-600 hover:bg-pullim-slate-100 hover:text-pullim-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : (
          <MobileDrawer role={role} />
        )}

        {/* 로고 */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5"
          aria-label="풀림 게임즈 홈"
        >
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="h-7 w-7 shrink-0"
          >
            <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
            <rect x="30" y="26" width="8" height="8" fill="#FFFFFF" />
            <rect x="62" y="26" width="8" height="8" fill="#FFFFFF" />
            <rect x="38" y="34" width="24" height="8" fill="#FFFFFF" />
            <rect x="22" y="42" width="56" height="8" fill="#FFFFFF" />
            <rect x="22" y="50" width="8" height="8" fill="#FFFFFF" />
            <rect x="38" y="50" width="8" height="8" fill="#E6FF4C" />
            <rect x="54" y="50" width="8" height="8" fill="#E6FF4C" />
            <rect x="70" y="50" width="8" height="8" fill="#FFFFFF" />
            <rect x="22" y="58" width="56" height="8" fill="#FFFFFF" />
            <rect x="30" y="66" width="8" height="8" fill="#FFFFFF" />
            <rect x="62" y="66" width="8" height="8" fill="#FFFFFF" />
            <rect x="22" y="74" width="8" height="8" fill="#FFFFFF" />
            <rect x="70" y="74" width="8" height="8" fill="#FFFFFF" />
          </svg>
          <span className="text-sm font-bold tracking-tight text-pullim-slate-900">
            풀림
          </span>
          <span className="hidden text-[10px] font-bold uppercase tracking-wider text-pullim-slate-400 md:inline">
            게임즈
          </span>
        </Link>

        {/* default 모드에서만 우측 액션 — V0.5+ 활성. 현재는 시각 placeholder. */}
        {/* default 모드 우측 액션 — V0.5+ 활성 예정.
            모바일에서는 가로 공간 차지 회피 위해 hidden, sm: 이상에서만 시각 placeholder.
            Plan A Phase 6 — informational placeholder 정리. */}
        {!isGame && (
          <div className="ml-auto flex items-center gap-1">
            {/* 검색·알림은 V0.5+ placeholder — sm+ 에서만. */}
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                aria-label="검색 (준비 중)"
                disabled
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-pullim-slate-400 opacity-60"
                title="검색 — 준비 중"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="알림 (준비 중)"
                disabled
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-pullim-slate-400 opacity-60"
                title="알림 — 준비 중"
              >
                <Bell className="h-5 w-5" />
              </button>
            </div>
            {/* 계정 진입점 — 전 뷰포트 노출(모바일 포함). */}
            <AuthMenu />
          </div>
        )}
      </div>
    </header>
  );
}
