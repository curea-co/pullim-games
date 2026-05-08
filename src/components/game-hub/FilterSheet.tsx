"use client";

// 모바일 필터 sheet — mobile-drawer 자체 구현 패턴 차용.

import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { FilterContents } from "./FilterContents";
import type { FilterState } from "@/lib/games/filter";

interface Props {
  state: FilterState;
  onChange: (next: FilterState) => void;
  subjectOptions: { value: string; label: string }[];
  onReset: () => void;
  appliedCount: number;
}

export function FilterSheet({
  state,
  onChange,
  subjectOptions,
  onReset,
  appliedCount,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="필터 열기"
        className="inline-flex h-8 items-center gap-1.5 rounded-button border border-border-hairline bg-bg-block px-2.5 text-helper text-type-primary"
      >
        <Filter className="h-3.5 w-3.5" />
        필터
        {appliedCount > 0 && (
          <span className="rounded-full bg-accent-positive/10 px-1.5 text-[10px] font-bold text-accent-positive tabular">
            {appliedCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="필터"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-pullim-slate-900/40 backdrop-blur-sm"
          />
          <div className="absolute right-0 top-0 flex h-full w-80 max-w-[88vw] flex-col bg-card shadow-pullim-sm">
            <div className="flex items-center justify-between border-b border-pullim-slate-200 px-4 py-3">
              <span className="text-sm font-bold text-pullim-slate-900">
                필터
              </span>
              <button
                type="button"
                aria-label="필터 닫기"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-pullim-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterContents
                state={state}
                onChange={onChange}
                subjectOptions={subjectOptions}
                onReset={onReset}
              />
            </div>
            <div className="border-t border-pullim-slate-200 p-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-button border border-type-primary bg-bg-block px-3 py-2 text-body text-type-primary"
              >
                결과 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
