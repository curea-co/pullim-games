"use client";

// 메커닉 선택 — 4 카드 (객관식·빈칸·타이핑·매칭). shadcn ToggleGroup 사용.

import {
  Pencil,
  Type,
  CircleDot,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CustomCardKind } from "@/lib/core";

const OPTIONS: Array<{
  kind: CustomCardKind;
  label: string;
  desc: string;
  icon: LucideIcon;
}> = [
  {
    kind: "multiple-choice",
    label: "객관식",
    desc: "4지선다 단답",
    icon: CircleDot,
  },
  {
    kind: "blank",
    label: "빈칸",
    desc: "본문 + 빈칸 + 4지선다",
    icon: Pencil,
  },
  { kind: "typing", label: "타이핑", desc: "정답 직접 입력", icon: Type },
  {
    kind: "word-match",
    label: "매칭",
    desc: "짝 맞추기",
    icon: Link2,
  },
];

interface Props {
  value: CustomCardKind | null;
  onChange: (kind: CustomCardKind) => void;
}

export function MechanicPicker({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v as CustomCardKind)}
      aria-label="게임 메커닉"
      className="grid grid-cols-2 gap-2"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <ToggleGroupItem
            key={opt.kind}
            value={opt.kind}
            aria-label={opt.label}
            className="flex h-auto flex-col items-start gap-1 rounded-block border border-border-hairline bg-bg-block p-3 text-left text-type-primary transition-colors hover:border-type-primary/30 hover:bg-bg-block hover:text-type-primary data-[state=on]:border-type-primary data-[state=on]:bg-accent-positive/5"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-600 group-data-[state=on]:bg-accent-positive/10 group-data-[state=on]:text-accent-positive"
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-label font-bold text-type-primary">
                {opt.label}
              </span>
            </span>
            <span className="text-helper font-normal text-type-secondary">
              {opt.desc}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
