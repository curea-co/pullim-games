// 홈 대시보드 KPI 카드.
// `2026-05-08_home-dashboard.md` §6.1 따름.

import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, helper, icon: Icon }: Props) {
  return (
    <article className="flex flex-col gap-2 rounded-block border border-border-hairline bg-bg-block p-4">
      <header className="flex items-center gap-2">
        {Icon && (
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-button bg-accent-positive/10 text-accent-positive"
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
        <span className="text-helper text-type-secondary">{label}</span>
      </header>
      <p className="text-display tabular text-type-primary">{value}</p>
      {helper && (
        <p className="text-helper tabular text-type-secondary">{helper}</p>
      )}
    </article>
  );
}
