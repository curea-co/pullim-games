"use client";

// 필터 콘텐츠 — FilterPanel (데스크탑 사이드) 와 FilterSheet (모바일 drawer) 공유.

import { Search, X } from "lucide-react";
import {
  DEPTH_OPTIONS,
  MECHANIC_OPTIONS,
  PROGRESS_OPTIONS,
  TIME_OPTIONS,
  type FilterState,
} from "@/lib/games/filter";
import { cn } from "@/lib/utils";

interface FilterContentsProps {
  state: FilterState;
  onChange: (next: FilterState) => void;
  subjectOptions: { value: string; label: string }[];
  onReset: () => void;
}

interface ChipGroupProps {
  label: string;
  options: { value: string; label: string }[];
  current: string;
  onSelect: (value: string) => void;
}

function ChipGroup({ label, options, current, onSelect }: ChipGroupProps) {
  return (
    <div>
      <p className="mb-1.5 text-helper font-bold text-type-secondary">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              aria-pressed={isActive}
              className={cn(
                "rounded-button border px-2.5 py-1 text-helper transition-colors",
                isActive
                  ? "border-type-primary bg-accent-positive/10 font-medium text-type-primary"
                  : "border-border-hairline bg-bg-block text-type-secondary hover:border-type-secondary/40 hover:text-type-primary",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterContents({
  state,
  onChange,
  subjectOptions,
  onReset,
}: FilterContentsProps) {
  function patch<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...state, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 */}
      <div>
        <p className="mb-1.5 text-helper font-bold text-type-secondary">검색</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-type-secondary" />
          <input
            type="search"
            value={state.search ?? ""}
            onChange={(e) => patch("search", e.target.value)}
            placeholder="제목·단원·태그라인"
            className="w-full rounded-button border border-border-hairline bg-bg-block py-1.5 pl-8 pr-2 text-helper text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
            autoComplete="off"
          />
          {state.search && (
            <button
              type="button"
              onClick={() => patch("search", "")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-type-secondary/60 hover:text-type-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ChipGroup
        label="과목"
        options={subjectOptions}
        current={state.subject ?? "all"}
        onSelect={(v) => patch("subject", v)}
      />
      <ChipGroup
        label="메커닉"
        options={MECHANIC_OPTIONS}
        current={state.mechanic ?? "all"}
        onSelect={(v) =>
          patch("mechanic", v as FilterState["mechanic"])
        }
      />
      <ChipGroup
        label="깊이"
        options={DEPTH_OPTIONS}
        current={state.depth ?? "all"}
        onSelect={(v) => patch("depth", v as FilterState["depth"])}
      />
      <ChipGroup
        label="세션 시간"
        options={TIME_OPTIONS}
        current={state.time ?? "all"}
        onSelect={(v) => patch("time", v as FilterState["time"])}
      />
      <ChipGroup
        label="진행도"
        options={PROGRESS_OPTIONS}
        current={state.progress ?? "all"}
        onSelect={(v) => patch("progress", v as FilterState["progress"])}
      />

      <button
        type="button"
        onClick={onReset}
        className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-helper text-type-secondary hover:text-type-primary"
      >
        필터 초기화
      </button>
    </div>
  );
}
