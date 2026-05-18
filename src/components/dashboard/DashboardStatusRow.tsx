// 홈 대시보드 상단 status row — streak·due-soon·today attempts 3 칩.
// plan: proc/plan/2026-05-18_home-dashboard-revamp.md §3 Phase 1.

import { CalendarClock, Flame, Sparkles } from "lucide-react";
import type { DashboardStats } from "@/lib/core";
import { cn } from "@/lib/utils";

interface Props {
  stats: DashboardStats;
}

export function DashboardStatusRow({ stats }: Props) {
  const items: Array<{
    key: string;
    icon: typeof Flame;
    label: string;
    value: string;
    helper?: string;
    active: boolean;
  }> = [
    {
      key: "today",
      icon: Sparkles,
      label: "오늘",
      value:
        stats.todayAttempts > 0
          ? `${stats.todayAttempts}장`
          : "시작 전",
      active: stats.todayAttempts > 0,
    },
    {
      key: "due",
      icon: CalendarClock,
      label: "다시 만날 카드",
      value:
        stats.dueSoonCount > 0
          ? `${stats.dueSoonCount}장`
          : "없음",
      active: stats.dueSoonCount > 0,
    },
    {
      key: "streak",
      icon: Flame,
      label: "연속 학습",
      value:
        stats.streak.current >= 1
          ? `${stats.streak.current}일`
          : "오늘부터",
      helper:
        stats.streak.longest >= 2 && stats.streak.longest > stats.streak.current
          ? `최장 ${stats.streak.longest}일`
          : undefined,
      active: stats.streak.current >= 2,
    },
  ];

  return (
    <ul
      aria-label="학습 상태"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li
            key={item.key}
            className={cn(
              "flex items-center gap-3 rounded-block border border-border-hairline bg-bg-block px-3 py-2.5",
              item.active && "border-accent-positive/30",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-button",
                item.active
                  ? "bg-accent-positive/10 text-accent-positive"
                  : "bg-bg-canvas text-type-tertiary",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-helper text-type-secondary">
                {item.label}
              </span>
              <span className="text-label tabular font-bold text-type-primary">
                {item.value}
                {item.helper && (
                  <span className="ml-1.5 text-helper font-normal text-type-tertiary">
                    · {item.helper}
                  </span>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
