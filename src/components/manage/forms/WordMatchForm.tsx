"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CustomWordMatchCard } from "@/lib/core";

interface Props {
  draft: Partial<CustomWordMatchCard>;
  onChange: (next: Partial<CustomWordMatchCard>) => void;
}

export function WordMatchForm({ draft, onChange }: Props) {
  const pairs = draft.pairs ?? [
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
  ];

  function setPair(i: number, side: "left" | "right", value: string) {
    const next = pairs.map((p, idx) =>
      idx === i ? { ...p, [side]: value } : p,
    );
    onChange({ ...draft, pairs: next });
  }

  function addPair() {
    if (pairs.length >= 8) return;
    onChange({ ...draft, pairs: [...pairs, { left: "", right: "" }] });
  }

  function removePair(i: number) {
    if (pairs.length <= 4) return;
    onChange({ ...draft, pairs: pairs.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-helper text-type-secondary">
        짝 4-8개 (왼쪽 ↔ 오른쪽)
      </p>
      {pairs.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={p.left}
            onChange={(e) => setPair(i, "left", e.target.value)}
            placeholder="왼쪽"
            className="flex-1 rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
          />
          <span aria-hidden="true" className="text-type-secondary">
            ↔
          </span>
          <input
            type="text"
            value={p.right}
            onChange={(e) => setPair(i, "right", e.target.value)}
            placeholder="오른쪽"
            className="flex-1 rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removePair(i)}
            disabled={pairs.length <= 4}
            aria-label={`짝 ${i + 1} 삭제`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addPair}
        disabled={pairs.length >= 8}
        className="inline-flex items-center gap-1.5 self-start rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper text-type-secondary hover:text-type-primary disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        짝 추가 ({pairs.length}/8)
      </button>
    </div>
  );
}
