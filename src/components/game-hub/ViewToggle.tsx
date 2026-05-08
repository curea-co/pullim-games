"use client";

// 게임 허브 뷰 전환 토글 — `2026-05-08_game-hub.md` §4.5.

import { Grid3x3, LayoutGrid, List, Table } from "lucide-react";
import { cn } from "@/lib/utils";

export type GameHubView = "grid" | "list" | "table" | "thumbnail";

const OPTIONS: Array<{
  value: GameHubView;
  label: string;
  icon: typeof Grid3x3;
}> = [
  { value: "grid", label: "그리드", icon: Grid3x3 },
  { value: "list", label: "리스트", icon: List },
  { value: "table", label: "테이블", icon: Table },
  { value: "thumbnail", label: "썸네일", icon: LayoutGrid },
];

interface Props {
  value: GameHubView;
  onChange: (view: GameHubView) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="뷰 전환"
      className="inline-flex items-center gap-0.5 rounded-button border border-border-hairline bg-bg-block p-0.5"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-button transition-colors",
              isActive
                ? "bg-accent-positive/10 text-accent-positive"
                : "text-type-secondary hover:text-type-primary",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 2} />
          </button>
        );
      })}
    </div>
  );
}
