"use client";

// Mode A (교육과정) / Mode B (자료) 토글.

import { BookOpenText, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type GenerateMode = "curriculum" | "source";

interface Props {
  value: GenerateMode;
  onChange: (m: GenerateMode) => void;
}

export function ModeToggle({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="생성 방식"
      className="grid grid-cols-2 gap-2"
    >
      <ModeButton
        active={value === "curriculum"}
        icon={<BookOpenText className="h-4 w-4" />}
        title="교육과정에서"
        desc="기본 단원의 자료로 자동 생성"
        onClick={() => onChange("curriculum")}
      />
      <ModeButton
        active={value === "source"}
        icon={<FileText className="h-4 w-4" />}
        title="내 자료로"
        desc="텍스트만 붙여넣기 (AI 자동 추출)"
        onClick={() => onChange("source")}
      />
    </div>
  );
}

function ModeButton(props: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.active}
      onClick={props.onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-block border bg-bg-block p-3 text-left transition-colors",
        props.active
          ? "border-type-primary bg-accent-positive/5"
          : "border-border-hairline hover:border-type-primary/30",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-button",
            props.active
              ? "bg-accent-positive/10 text-accent-positive"
              : "bg-pullim-slate-100 text-pullim-slate-600",
          )}
        >
          {props.icon}
        </span>
        <span className="text-label font-bold text-type-primary">
          {props.title}
        </span>
      </span>
      <span className="text-helper text-type-secondary">{props.desc}</span>
    </button>
  );
}
