"use client";

// 필터 칩 — Plan F §7.2 단계적 활성화.
// 게임 수 임계 미만이면 null 반환 (실제 활성 정책은 메인페이지 page.tsx 가 결정).
//
// V2: 과목 1축. V3: 과목 + 메커닉 2축.

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export interface FilterChipOption {
  /** URL 쿼리 값 (예: 'math', 'manipulation'). 'all' 또는 빈 값 = 전체. */
  value: string;
  label: string;
}

interface FilterChipsProps {
  /** URL 쿼리 파라미터 키 (예: 'subject', 'mechanic'). */
  paramKey: string;
  options: FilterChipOption[];
  ariaLabel: string;
}

export function FilterChips({
  paramKey,
  options,
  ariaLabel,
}: FilterChipsProps) {
  const search = useSearchParams();
  const current = search.get(paramKey) ?? "all";

  function buildHref(value: string): string {
    const next = new URLSearchParams(search.toString());
    if (value === "all") {
      next.delete(paramKey);
    } else {
      next.set(paramKey, value);
    }
    const qs = next.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none" }}
    >
      {options.map((opt) => {
        const isSelected = current === opt.value;
        return (
          <Link
            key={opt.value}
            href={buildHref(opt.value)}
            scroll={false}
            className={`shrink-0 rounded-button border px-4 py-2 text-label transition-colors ${
              isSelected
                ? "border-type-primary bg-accent-positive/10 font-medium text-type-primary"
                : "border-border-hairline bg-bg-block text-type-secondary hover:border-type-secondary/40 hover:text-type-primary"
            }`}
            aria-current={isSelected ? "page" : undefined}
          >
            {opt.label}
          </Link>
        );
      })}
    </nav>
  );
}
