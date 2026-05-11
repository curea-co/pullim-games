"use client";

// 카드 수 선택 + 생성 버튼.

import { Sparkles } from "lucide-react";

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
      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">카드 수</span>
        <select
          value={count}
          onChange={(e) => onCountChange(Number(e.target.value))}
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary focus:border-type-primary focus:outline-none"
        >
          {COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}장
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled || loading}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-button border border-type-primary bg-bg-block px-4 py-2.5 text-body font-medium text-type-primary hover:bg-accent-positive/10 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "생성 중..." : "자동 생성"}
      </button>
    </div>
  );
}
