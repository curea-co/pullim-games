"use client";

// 풀림 게임즈 사이드바 — pullim-study-demo StudentSidebar 패턴 차용.
// 홈 + 7 도메인 (게임즈 활성, 6 잠금) + 활성 도메인 children 인덴트.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import {
  findActiveSection,
  studentDomains,
  studentHomeItem,
  type NavItem,
  type NavSubItem,
  type Role,
} from "./nav-config";
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
  const activeSection = findActiveSection(pathname, role);

  return (
    <nav
      aria-label="풀림 게임즈 메뉴"
      className={cn(
        "flex flex-col overflow-y-auto py-3",
        compact ? "px-1.5" : "px-2",
        className,
      )}
    >
      {/* 1. 홈 — 별도 구분 */}
      <ul className="space-y-0.5">
        <NavRow
          item={studentHomeItem}
          pathname={pathname}
          onNavigate={onNavigate}
          compact={compact}
          isActive={pathname === "/"}
        />
      </ul>

      <div
        className={cn(
          "my-3 border-t border-pullim-slate-200",
          compact && "mx-1",
        )}
      />

      {/* 2. 7 도메인 (게임즈 활성, 6 잠금) — 활성 도메인 children 펼침 */}
      <ul className="space-y-0.5">
        {studentDomains.map((domain) => {
          const isActive = activeSection?.href === domain.href;
          const activeSubHref = isActive
            ? findActiveSubHref(pathname, domain.children)
            : undefined;
          return (
            <li key={domain.href}>
              <NavRow
                item={domain}
                pathname={pathname}
                onNavigate={onNavigate}
                compact={compact}
                isActive={isActive}
              />
              {isActive && domain.children && (
                <ul
                  className={cn(
                    "mt-0.5 space-y-0.5",
                    compact
                      ? "ml-0"
                      : "ml-3 border-l border-pullim-slate-200 pl-2",
                  )}
                >
                  {domain.children.map((sub) => (
                    <SubNavRow
                      key={sub.href}
                      sub={sub}
                      isActive={sub.href === activeSubHref}
                      onNavigate={onNavigate}
                      compact={compact}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface NavRowProps {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
  isActive: boolean;
}

function NavRow({ item, onNavigate, compact, isActive }: NavRowProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.locked ? "#" : item.href}
      onClick={item.locked ? (e) => e.preventDefault() : onNavigate}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={item.locked || undefined}
      title={compact ? item.label : item.description}
      className={cn(
        "group flex items-center gap-2 rounded-lg text-sm font-medium transition-colors",
        compact ? "h-11 w-full justify-center" : "min-h-11 px-2 py-2",
        isActive
          ? "bg-pullim-blue-50 text-pullim-blue-700"
          : item.locked
            ? "cursor-not-allowed text-pullim-slate-400 hover:bg-pullim-slate-50"
            : "text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive && "stroke-[2.4]",
        )}
      />
      {!compact && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.locked && (
            <Lock className="h-3 w-3 text-pullim-slate-300" />
          )}
          {item.badge !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                "bg-pullim-slate-100 text-pullim-slate-600",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function findActiveSubHref(
  pathname: string,
  children: NavSubItem[] | undefined,
): string | undefined {
  if (!children) return undefined;
  let best: string | undefined;
  for (const sub of children) {
    if (pathname === sub.href || pathname.startsWith(sub.href + "/")) {
      if (!best || sub.href.length > best.length) {
        best = sub.href;
      }
    }
  }
  return best;
}

interface SubNavRowProps {
  sub: NavSubItem;
  isActive: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}

function SubNavRow({ sub, isActive, onNavigate, compact }: SubNavRowProps) {
  const Icon = sub.icon;
  return (
    <li>
      <Link
        href={sub.locked ? "#" : sub.href}
        onClick={sub.locked ? (e) => e.preventDefault() : onNavigate}
        aria-current={isActive ? "page" : undefined}
        aria-disabled={sub.locked || undefined}
        title={compact ? sub.label : sub.description}
        className={cn(
          "group flex items-center gap-2 rounded-lg text-xs font-medium transition-colors",
          compact ? "h-10 w-full justify-center" : "min-h-10 px-2 py-2",
          isActive
            ? "bg-pullim-blue-600 text-white shadow-pullim-sm"
            : sub.locked
              ? "cursor-not-allowed text-pullim-slate-400 hover:bg-pullim-slate-50"
              : "text-pullim-slate-600 hover:bg-pullim-slate-100 hover:text-pullim-slate-900",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isActive && "stroke-[2.4]",
            )}
          />
        )}
        {!compact && (
          <>
            <span className="flex-1 truncate">{sub.label}</span>
            {sub.locked && (
              <Lock
                className={cn(
                  "h-3 w-3",
                  isActive ? "text-white/70" : "text-pullim-slate-300",
                )}
              />
            )}
          </>
        )}
      </Link>
    </li>
  );
}
