"use client";

// 관리 페이지 sub-route 탭 — 6 페이지 가로 탭.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/manage", label: "홈" },
  { href: "/manage/subjects", label: "과목" },
  { href: "/manage/curriculum", label: "교육과정" },
  { href: "/manage/content", label: "콘텐츠" },
  { href: "/manage/custom-games", label: "내 게임" },
  { href: "/manage/billing", label: "결제" },
];

export function ManageNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="관리 메뉴"
      className="flex gap-1 overflow-x-auto border-b border-border-hairline pb-px"
    >
      {TABS.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/manage" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-t-button px-3 py-2 text-helper transition-colors",
              isActive
                ? "border-b-2 border-accent-positive font-bold text-type-primary"
                : "text-type-secondary hover:text-type-primary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
