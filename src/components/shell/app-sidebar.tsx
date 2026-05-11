"use client";

// 풀림 게임즈 사이드바.
// `2026-05-08_nav-ia-restructure.md` §5 따름 — 4 메뉴 평탄화, children 펼침 폐기.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findActiveNav, studentDomains, type NavItem, type Role } from "./nav-config";
import { cn } from "@/lib/utils";

interface Props {
  role: Role;
  /** 항목 클릭 시 추가 처리 (모바일 drawer 자동 닫힘 등) */
  onNavigate?: () => void;
  className?: string;
  /** "icon only" 축약 모드 — 태블릿 (md) */
  compact?: boolean;
}

export function AppSidebar({ role, onNavigate, className, compact }: Props) {
  const pathname = usePathname();
  const active = findActiveNav(pathname, role);

  return (
    <nav
      aria-label="풀림 게임즈 메뉴"
      className={cn(
        "flex flex-col overflow-y-auto py-3",
        compact ? "px-1.5" : "px-2",
        className,
      )}
    >
      <ul className="space-y-0.5">
        {studentDomains.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            isActive={active?.href === item.href}
            onNavigate={onNavigate}
            compact={compact}
          />
        ))}
      </ul>
    </nav>
  );
}

interface NavRowProps {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}

function NavRow({ item, isActive, onNavigate, compact }: NavRowProps) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        title={compact ? item.label : item.description}
        className={cn(
          "group flex items-center gap-2 rounded-lg text-sm font-medium transition-colors",
          compact ? "h-11 w-full justify-center" : "min-h-11 px-2 py-2",
          isActive
            ? "bg-accent-positive/10 font-semibold text-pullim-slate-900"
            : "text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive && "stroke-[2.4] text-accent-positive",
          )}
        />
        {!compact && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-full bg-pullim-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-pullim-slate-600">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    </li>
  );
}
