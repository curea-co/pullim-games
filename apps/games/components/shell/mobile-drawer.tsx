"use client";

// 모바일 햄버거 → 사이드바 drawer.
// pullim-study-demo MobileDrawer (Sheet 의존) 자체 구현 버전.
// shadcn/ui Sheet 미사용 — fixed overlay + slide panel + ESC/backdrop close.

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import type { Role } from "./nav-config";

export function MobileDrawer({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  // ESC 닫기 + body scroll lock
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 열기"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-button hover:bg-pullim-slate-100 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="메뉴"
          className="fixed inset-0 z-50 md:hidden"
        >
          {/* backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-pullim-slate-900/40 backdrop-blur-sm"
          />
          {/* drawer panel */}
          <div className="relative flex h-full w-72 flex-col bg-card shadow-pullim-sm">
            <div className="flex items-center justify-between border-b border-pullim-slate-200 px-4 py-3">
              <span className="text-sm font-bold text-pullim-slate-900">
                풀림 게임즈
              </span>
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-button hover:bg-pullim-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AppSidebar
              role={role}
              onNavigate={() => setOpen(false)}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </>
  );
}
