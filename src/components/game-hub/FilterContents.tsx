"use client";

// 필터 콘텐츠 — FilterPanel (데스크탑 사이드) 와 FilterSheet (모바일 drawer) 공유.
// `2026-05-08_filter-accordion.md` 따름 — 5 카테고리 아코디언 (단일 펼침).

import { useId, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import {
  DEPTH_OPTIONS,
  MECHANIC_OPTIONS,
  PROGRESS_OPTIONS,
  TIME_OPTIONS,
  type FilterState,
} from "@/lib/games/filter";
import { cn } from "@/lib/utils";

type FilterKey = "subject" | "mechanic" | "depth" | "time" | "progress";

interface FilterContentsProps {
  state: FilterState;
  onChange: (next: FilterState) => void;
  subjectOptions: { value: string; label: string }[];
  onReset: () => void;
}

interface ChipGroupProps {
  options: { value: string; label: string }[];
  current: string;
  onSelect: (value: string) => void;
}

function ChipGroup({ options, current, onSelect }: ChipGroupProps) {
  return (
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
  );
}

interface AccordionItemProps {
  label: string;
  /** 닫힌 상태 헤더 우측에 노출할 선택값 라벨. undefined 면 표시 안 함. */
  summary?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionItem({
  label,
  summary,
  isOpen,
  onToggle,
  children,
}: AccordionItemProps) {
  const bodyId = useId();
  return (
    <div className="border-b border-border-hairline last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-2 py-2 text-left"
      >
        <span className="text-helper font-bold text-type-secondary">
          {label}
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
          {summary && (
            <span className="truncate text-helper text-type-primary">
              {summary}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-type-secondary transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </span>
      </button>
      {isOpen && (
        <div id={bodyId} role="region" className="pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

function lookupLabel(
  options: { value: string; label: string }[],
  value: string | undefined,
): string | undefined {
  if (!value || value === "all") return undefined;
  return options.find((o) => o.value === value)?.label;
}

function countApplied(state: FilterState): number {
  let n = 0;
  if (state.subject && state.subject !== "all") n += 1;
  if (state.mechanic && state.mechanic !== "all") n += 1;
  if (state.depth && state.depth !== "all") n += 1;
  if (state.time && state.time !== "all") n += 1;
  if (state.progress && state.progress !== "all") n += 1;
  if (state.search) n += 1;
  return n;
}

export function FilterContents({
  state,
  onChange,
  subjectOptions,
  onReset,
}: FilterContentsProps) {
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);

  function patch<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...state, [key]: value });
  }

  function toggle(key: FilterKey) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  const applied = countApplied(state);

  return (
    <div className="flex flex-col gap-3">
      {/* 검색 — 항상 노출 */}
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

      {/* 아코디언 — 5 카테고리, 단일 펼침 */}
      <div className="rounded-block border border-border-hairline bg-bg-block px-3">
        <AccordionItem
          label="과목"
          summary={lookupLabel(subjectOptions, state.subject)}
          isOpen={openKey === "subject"}
          onToggle={() => toggle("subject")}
        >
          <ChipGroup
            options={subjectOptions}
            current={state.subject ?? "all"}
            onSelect={(v) => patch("subject", v)}
          />
        </AccordionItem>
        <AccordionItem
          label="메커닉"
          summary={lookupLabel(MECHANIC_OPTIONS, state.mechanic)}
          isOpen={openKey === "mechanic"}
          onToggle={() => toggle("mechanic")}
        >
          <ChipGroup
            options={MECHANIC_OPTIONS}
            current={state.mechanic ?? "all"}
            onSelect={(v) => patch("mechanic", v as FilterState["mechanic"])}
          />
        </AccordionItem>
        <AccordionItem
          label="깊이"
          summary={lookupLabel(DEPTH_OPTIONS, state.depth)}
          isOpen={openKey === "depth"}
          onToggle={() => toggle("depth")}
        >
          <ChipGroup
            options={DEPTH_OPTIONS}
            current={state.depth ?? "all"}
            onSelect={(v) => patch("depth", v as FilterState["depth"])}
          />
        </AccordionItem>
        <AccordionItem
          label="세션 시간"
          summary={lookupLabel(TIME_OPTIONS, state.time)}
          isOpen={openKey === "time"}
          onToggle={() => toggle("time")}
        >
          <ChipGroup
            options={TIME_OPTIONS}
            current={state.time ?? "all"}
            onSelect={(v) => patch("time", v as FilterState["time"])}
          />
        </AccordionItem>
        <AccordionItem
          label="진행도"
          summary={lookupLabel(PROGRESS_OPTIONS, state.progress)}
          isOpen={openKey === "progress"}
          onToggle={() => toggle("progress")}
        >
          <ChipGroup
            options={PROGRESS_OPTIONS}
            current={state.progress ?? "all"}
            onSelect={(v) => patch("progress", v as FilterState["progress"])}
          />
        </AccordionItem>
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={applied === 0}
        className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-helper text-type-secondary hover:text-type-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-type-secondary"
      >
        필터 초기화{applied > 0 && ` (${applied})`}
      </button>
    </div>
  );
}
