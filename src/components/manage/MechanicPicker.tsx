"use client";

// 메커닉 선택 — 4 카드 (객관식·빈칸·타이핑·매칭).

import {
  Pencil,
  Type,
  CircleDot,
  Link2,
  type LucideIcon,
} from "lucide-react";
import type { CustomCardKind } from "@/lib/core";
import { cn } from "@/lib/utils";

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
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.kind;
        return (
          <button
            key={opt.kind}
            type="button"
            onClick={() => onChange(opt.kind)}
            aria-pressed={isActive}
            className={cn(
              "flex flex-col items-start gap-1 rounded-block border bg-bg-block p-3 text-left transition-colors",
              isActive
                ? "border-type-primary bg-accent-positive/5"
                : "border-border-hairline hover:border-type-primary/30",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-button",
                  isActive
                    ? "bg-accent-positive/10 text-accent-positive"
                    : "bg-pullim-slate-100 text-pullim-slate-600",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-label font-bold text-type-primary">
                {opt.label}
              </span>
            </span>
            <span className="text-helper text-type-secondary">{opt.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
