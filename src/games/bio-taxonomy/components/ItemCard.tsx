// 드래그 가능한 카드. drag-end 시 부모가 zone hit-test → assign or animate-back.
// framer-motion drag + layout — drop 후 새 위치로 spring 이동.

import { motion, type PanInfo } from "framer-motion";
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
  /** 카테고리 색 인덱스 (0..3). 미배치 시 null. */
  categoryColorIndex: number | null;
  disabled: boolean;
  onDragStart: () => void;
  onDragEnd: (info: PanInfo) => void;
}

export function ItemCard({
  item,
  placed,
  categoryColorIndex,
  disabled,
  onDragStart,
  onDragEnd,
}: ItemCardProps) {
  const colorClass =
    placed && categoryColorIndex !== null
      ? CATEGORY_COLORS[categoryColorIndex] ?? CATEGORY_COLORS[0]
      : "border-border-hairline bg-bg-block text-type-primary";
  return (
    <motion.div
      layout
      layoutId={`bio-${item.id}`}
      drag={!disabled}
      dragMomentum={false}
      dragElastic={0.1}
      dragSnapToOrigin
      whileDrag={{ scale: 1.06, zIndex: 50 }}
      onDragStart={onDragStart}
      onDragEnd={(_, info) => onDragEnd(info)}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      role="button"
      tabIndex={0}
      aria-label={`카드 ${item.label}${placed ? ", 배치됨 — 다른 영역으로 드래그" : ", 카테고리로 드래그"}`}
      className={`min-h-[2.5rem] cursor-grab touch-none select-none rounded-block border px-2.5 py-1.5 text-body transition-colors active:cursor-grabbing disabled:opacity-60 ${colorClass} ${
        disabled ? "pointer-events-none" : ""
      }`}
    >
      {item.label}
    </motion.div>
  );
}
