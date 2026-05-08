"use client";

// 게임 허브 뷰 전환 토글 — shadcn ToggleGroup.

import { Grid3x3, LayoutGrid, List, Table } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as GameHubView)}
      aria-label="뷰 전환"
      className="inline-flex items-center gap-0.5 rounded-button border border-border-hairline bg-bg-block p-0.5"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            aria-label={opt.label}
            title={opt.label}
            className="h-8 w-8 min-w-0 rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary data-[state=on]:bg-accent-positive/10 data-[state=on]:text-accent-positive"
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
