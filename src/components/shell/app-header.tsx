// 풀림 게임즈 상단 헤더.
// pullim-study-demo AppHeader 의 simplified 버전 — V0.4 시점에는 검색·알림·프로필
// 같은 우측 액션은 placeholder 만 (잠금 표시). 햄버거(모바일) + 로고만 동작.

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { MobileDrawer } from "./mobile-drawer";
import type { Role } from "./nav-config";

export function AppHeader({ role }: { role: Role }) {
  return (
    <header className="sticky top-0 z-30 border-b border-pullim-slate-200 bg-card/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        {/* 모바일 햄버거 */}
        <MobileDrawer role={role} />

        {/* 로고 */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5"
          aria-label="풀림 게임즈 홈"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-positive/10 text-accent-positive"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </span>
          <span className="text-sm font-bold tracking-tight text-pullim-slate-900">
            풀림
          </span>
          <span className="hidden text-[10px] font-bold uppercase tracking-wider text-pullim-slate-400 md:inline">
            게임즈
          </span>
        </Link>

        {/* 우측 액션 — V0.5+ 활성. 현재는 시각 placeholder. */}
        <div className="ml-auto flex items-center gap-1">
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
          <span
            aria-label="프로필 (준비 중)"
            title="프로필 — 준비 중"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-pullim-slate-200 text-xs font-bold text-pullim-slate-500"
          >
            ·
          </span>
        </div>
      </div>
    </header>
  );
}
