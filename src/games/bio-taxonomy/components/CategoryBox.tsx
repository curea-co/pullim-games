// 카테고리 박스 — drop zone. ref 노출 (부모의 drag-end hit-test 에서 bounding rect 사용).
// dragOver 시 outline + ring 강조.

import { forwardRef, type ReactNode } from "react";
import type { Category } from "../schema";
import { CATEGORY_COLORS } from "./ItemCard";

interface CategoryBoxProps {
  category: Category;
  colorIndex: number;
  /** 드래그 중 pointer 가 이 박스 위에 있을 때 true. */
  dragOver: boolean;
  /** 카테고리 안 카드들 (자식). 부모가 ItemCard 렌더링. */
  children: ReactNode;
}

export const CategoryBox = forwardRef<HTMLDivElement, CategoryBoxProps>(
  function CategoryBox({ category, colorIndex, dragOver, children }, ref) {
    const tintClass = CATEGORY_COLORS[colorIndex] ?? CATEGORY_COLORS[0];
    const borderClass = tintClass!.split(" ")[2] ?? "border-border-hairline";
    return (
      <div
        ref={ref}
        data-category-id={category.id}
        aria-label={`${category.label} 분류 영역`}
        className={`flex min-h-[7rem] flex-col gap-2 rounded-block border-2 p-2.5 transition-all ${borderClass} ${
          dragOver ? "ring-2 ring-offset-1 ring-type-primary scale-[1.01]" : ""
        }`}
      >
        <span
          className={`rounded-button px-2 py-1 text-label tabular text-type-primary text-center ${tintClass}`}
        >
          {category.label}
        </span>
        <div className="flex flex-wrap items-start gap-1.5">{children}</div>
      </div>
    );
  },
);
