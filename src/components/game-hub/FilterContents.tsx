"use client";

// 필터 콘텐츠 — shadcn Accordion + ToggleGroup.
// `2026-05-08_shadcn-migration.md` Phase 2 구현.

import { Search, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DEPTH_OPTIONS,
  MECHANIC_OPTIONS,
  PROGRESS_OPTIONS,
  TIME_OPTIONS,
  type FilterState,
} from "@/lib/games/filter";

interface FilterContentsProps {
  state: FilterState;
  onChange: (next: FilterState) => void;
  subjectOptions: { value: string; label: string }[];
  onReset: () => void;
}

interface FilterToggleGroupProps {
  options: { value: string; label: string }[];
  current: string;
  onSelect: (value: string) => void;
  ariaLabel: string;
}

function FilterToggleGroup({
  options,
  current,
  onSelect,
  ariaLabel,
}: FilterToggleGroupProps) {
  return (
    <ToggleGroup
      type="single"
      value={current}
      onValueChange={(v) => v && onSelect(v)}
      aria-label={ariaLabel}
      className="flex-wrap justify-start gap-1.5"
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          aria-label={opt.label}
          className="h-7 min-w-0 rounded-button border border-border-hairline bg-bg-block px-2.5 text-xs font-normal text-type-secondary hover:bg-accent-positive/5 hover:text-type-primary data-[state=on]:border-type-primary data-[state=on]:bg-accent-positive/10 data-[state=on]:font-medium data-[state=on]:text-type-primary"
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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

interface AccordionRowConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  current: string;
  onSelect: (value: string) => void;
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

  const applied = countApplied(state);

  const rows: AccordionRowConfig[] = [
    {
      key: "subject",
      label: "과목",
      options: subjectOptions,
      current: state.subject ?? "all",
      onSelect: (v) => patch("subject", v),
    },
    {
      key: "mechanic",
      label: "메커닉",
      options: MECHANIC_OPTIONS,
      current: state.mechanic ?? "all",
      onSelect: (v) => patch("mechanic", v as FilterState["mechanic"]),
    },
    {
      key: "depth",
      label: "깊이",
      options: DEPTH_OPTIONS,
      current: state.depth ?? "all",
      onSelect: (v) => patch("depth", v as FilterState["depth"]),
    },
    {
      key: "time",
      label: "세션 시간",
      options: TIME_OPTIONS,
      current: state.time ?? "all",
      onSelect: (v) => patch("time", v as FilterState["time"]),
    },
    {
      key: "progress",
      label: "진행도",
      options: PROGRESS_OPTIONS,
      current: state.progress ?? "all",
      onSelect: (v) => patch("progress", v as FilterState["progress"]),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filter-search"
          className="text-helper font-bold text-type-secondary"
        >
          검색
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-type-secondary" />
          <Input
            id="filter-search"
            type="search"
            value={state.search ?? ""}
            onChange={(e) => patch("search", e.target.value)}
            placeholder="제목·단원·태그라인"
            autoComplete="off"
            className="h-9 pl-8 pr-7 text-helper"
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

      <Accordion
        type="single"
        collapsible
        className="rounded-block border border-border-hairline bg-bg-block px-3"
      >
        {rows.map((row) => {
          const summary = lookupLabel(row.options, row.current);
          return (
            <AccordionItem
              key={row.key}
              value={row.key}
              className="border-border-hairline last:border-b-0"
            >
              <AccordionTrigger className="py-2.5 text-helper font-bold text-type-secondary hover:no-underline [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-type-secondary">
                <span className="flex flex-1 items-center justify-between gap-2 pr-2">
                  <span>{row.label}</span>
                  {summary && (
                    <span className="truncate text-xs font-normal text-type-primary">
                      {summary}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                <FilterToggleGroup
                  options={row.options}
                  current={row.current}
                  onSelect={row.onSelect}
                  ariaLabel={row.label}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        disabled={applied === 0}
        className="rounded-button border-border-hairline bg-bg-block text-helper text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
      >
        필터 초기화{applied > 0 && ` (${applied})`}
      </Button>
    </div>
  );
}
