"use client";

// Mode A (교육과정 통합) / Mode B (자료) 토글. shadcn ToggleGroup.
// "교육과정" 안에서 seed 정적 변환 ↔ AI 생성 분기는 CurriculumPicker 가 자체 sub-toggle 로 처리.

import { BookOpenText, FileText } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type GenerateMode = "curriculum" | "source";

interface Props {
  value: GenerateMode;
  onChange: (m: GenerateMode) => void;
}

export function ModeToggle({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as GenerateMode)}
      aria-label="생성 방식"
      className="grid grid-cols-2 gap-2"
    >
      <ToggleGroupItem
        value="curriculum"
        aria-label="교육과정에서"
        className="flex h-auto flex-col items-start gap-1 rounded-block border border-border-hairline bg-bg-block p-3 text-left text-type-primary hover:border-type-primary/30 hover:bg-bg-block hover:text-type-primary data-[state=on]:border-type-primary data-[state=on]:bg-accent-positive/5"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-600">
            <BookOpenText className="h-4 w-4" />
          </span>
          <span className="text-label font-bold text-type-primary">
            교육과정에서
          </span>
        </span>
        <span className="text-helper font-normal text-type-secondary">
          단원 선택 → 정적 자료 또는 AI 생성
        </span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="source"
        aria-label="내 자료로"
        className="flex h-auto flex-col items-start gap-1 rounded-block border border-border-hairline bg-bg-block p-3 text-left text-type-primary hover:border-type-primary/30 hover:bg-bg-block hover:text-type-primary data-[state=on]:border-type-primary data-[state=on]:bg-accent-positive/5"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-600">
            <FileText className="h-4 w-4" />
          </span>
          <span className="text-label font-bold text-type-primary">
            내 자료로
          </span>
        </span>
        <span className="text-helper font-normal text-type-secondary">
          텍스트만 붙여넣기 (AI 자동 추출)
        </span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
