// 카드 — 풀 또는 카테고리 안에 위치. 탭으로 active toggle.
// 색깔: 미배치 (default) → 회색. 배치 → 카테고리 색. active → outline 강조.

import type { Item } from "../schema";

export const CATEGORY_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-pink-100 text-pink-800 border-pink-300",
];

interface ItemCardProps {
  item: Item;
  placed: boolean;
  /** 카테고리 색 인덱스 (0..3). 미배치 시 무시. */
  categoryColorIndex: number | null;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function ItemCard({
  item,
  placed,
  categoryColorIndex,
  active,
  disabled,
  onSelect,
}: ItemCardProps) {
  const colorClass =
    placed && categoryColorIndex !== null
      ? CATEGORY_COLORS[categoryColorIndex] ?? CATEGORY_COLORS[0]
      : "border-border-hairline bg-bg-block text-type-primary";
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`카드 ${item.label}${placed ? ", 배치됨" : ", 미배치"}`}
      className={`rounded-block border px-2.5 py-1.5 text-body transition-colors disabled:opacity-60 ${colorClass} ${
        active ? "ring-2 ring-offset-1 ring-type-primary" : ""
      }`}
    >
      {item.label}
    </button>
  );
}
