"use client";

// 컨텍스트 breadcrumb — 헤더 바로 아래.
// pullim-study-demo Breadcrumb 패턴 차용 (단순화).

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { buildBreadcrumb, type Role } from "./nav-config";

export function Breadcrumb({ role }: { role: Role }) {
  const pathname = usePathname();
  const trail = buildBreadcrumb(pathname, role);

  if (trail.length <= 1) return null;

  return (
    <nav
      aria-label="현재 위치"
      className="flex flex-wrap items-center gap-1 text-xs text-pullim-slate-500"
    >
      {trail.map((node, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={`${node.label}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 text-pullim-slate-300" />
            )}
            {node.href && !isLast ? (
              <Link
                href={node.href}
                className="hover:text-pullim-blue-600 hover:underline"
              >
                {node.label}
              </Link>
            ) : (
              <span
                className={isLast ? "font-semibold text-pullim-slate-900" : ""}
              >
                {node.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
