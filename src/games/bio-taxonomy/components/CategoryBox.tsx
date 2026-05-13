// 카테고리 박스 — 라벨 + 안에 들어간 카드 리스트.
// 활성 (active item 있을 때) 시 outline 강조. 클릭 시 active item 을 이 카테고리에 배치.

import type { Item, Category } from "../schema";
import { CATEGORY_COLORS, ItemCard } from "./ItemCard";

interface CategoryBoxProps {
  category: Category;
  colorIndex: number;
  /** 이 카테고리에 들어간 카드들. */
  items: Item[];
  activeItemId: string | null;
  /** active item 이 있을 때만 박스 자체가 클릭 가능 (배치 액션). */
  receivable: boolean;
  disabled: boolean;
  onReceive: () => void;
  onUnassign: (itemId: string) => void;
}

export function CategoryBox({
  category,
  colorIndex,
  items,
  activeItemId,
  receivable,
  disabled,
  onReceive,
  onUnassign,
}: CategoryBoxProps) {
  const tintClass = CATEGORY_COLORS[colorIndex] ?? CATEGORY_COLORS[0];
  return (
    <div
      className={`flex flex-col gap-2 rounded-block border-2 p-2.5 transition-colors ${
        receivable
          ? `${tintClass!.split(" ")[2]} ring-2 ring-offset-1 ring-type-primary`
          : tintClass!.split(" ")[2]
      }`}
      aria-label={`${category.label} 카테고리`}
    >
      <button
        type="button"
        onClick={onReceive}
        disabled={disabled || !receivable}
        aria-label={`${category.label} 카테고리에 카드 배치`}
        className={`rounded-button px-2 py-1 text-label tabular text-type-primary text-center ${tintClass} disabled:opacity-100`}
      >
        {category.label}
      </button>
      <div className="flex min-h-[2.25rem] flex-wrap items-start gap-1.5">
        {items.length === 0 ? (
          <span
            className="text-helper text-type-secondary"
            aria-hidden="true"
          >
            (비어있음)
          </span>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              placed
              categoryColorIndex={colorIndex}
              active={activeItemId === item.id}
              disabled={disabled}
              onSelect={() => onUnassign(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
