"use client";

// 모바일 필터 sheet — shadcn Sheet 사용.
// `2026-05-08_shadcn-migration.md` Phase 2 구현.

import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="필터 열기"
          className="h-8 gap-1.5 rounded-button border-border-hairline bg-bg-block px-2.5 text-helper text-type-primary"
        >
          <Filter className="h-3.5 w-3.5" />
          필터
          {appliedCount > 0 && (
            <span className="rounded-full bg-accent-positive/10 px-1.5 text-[10px] font-bold tabular text-accent-positive">
              {appliedCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-80 max-w-[88vw] flex-col gap-0 p-0 bg-bg-primary"
      >
        <SheetHeader className="border-b border-border-hairline px-4 py-3">
          <SheetTitle className="text-label font-bold text-type-primary">
            필터
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <FilterContents
            state={state}
            onChange={onChange}
            subjectOptions={subjectOptions}
            onReset={onReset}
          />
        </div>
        <SheetFooter className="border-t border-border-hairline p-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full rounded-button border-type-primary bg-bg-block text-body text-type-primary"
          >
            결과 보기
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
