"use client";

// 카드 수 선택 + 생성 버튼. shadcn Select + Button.

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  count: number;
  onCountChange: (n: number) => void;
  onGenerate: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const COUNT_OPTIONS = [5, 10, 20, 30];

export function GenerateButton({
  count,
  onCountChange,
  onGenerate,
  disabled,
  loading,
}: Props) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-helper text-type-secondary">카드 수</Label>
        <Select
          value={String(count)}
          onValueChange={(v) => onCountChange(Number(v))}
        >
          <SelectTrigger className="w-24 rounded-button border-border-hairline bg-bg-block text-body text-type-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNT_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}장
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        onClick={onGenerate}
        disabled={disabled || loading}
        variant="outline"
        className="flex-1 gap-2 rounded-button border-type-primary bg-bg-block text-body font-medium text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "생성 중..." : "자동 생성"}
      </Button>
    </div>
  );
}
