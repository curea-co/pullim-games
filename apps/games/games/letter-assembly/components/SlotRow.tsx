// 슬롯 행 — 좌→우 배치. 슬롯 탭 = active 카드 배치 또는 풀로 복귀.
// 森은 위 한 개/아래 두 개, 休의 왼쪽 人은 실제 변형 자형을 표시한다.

import type { ComponentCard, Slot } from "../schema";

interface SlotRowProps {
  slots: Slot[];
  target: string;
  /** slotId → 배치된 카드. */
  placements: Map<string, ComponentCard | null>;
  disabled: boolean;
  onSlotTap: (slotId: string) => void;
}

export function SlotRow({
  slots,
  target,
  placements,
  disabled,
  onSlotTap,
}: SlotRowProps) {
  const stacked = target === "森" && slots.length === 3;
  return (
    <div
      className={
        stacked
          ? "grid justify-center gap-2"
          : "flex items-center justify-center gap-2"
      }
      style={
        stacked ? { gridTemplateAreas: '"top top" "left right"' } : undefined
      }
    >
      {slots.map((slot, i) => {
        const occupant = placements.get(slot.id) ?? null;
        const displayText =
          target === "休" && i === 0 && occupant?.text === "人"
            ? "亻"
            : occupant?.text;
        return (
          <span
            key={slot.id}
            style={
              stacked
                ? {
                    gridArea: ["top", "left", "right"][i],
                    justifySelf: "center",
                  }
                : undefined
            }
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => onSlotTap(slot.id)}
              disabled={disabled}
              aria-label={
                occupant
                  ? `슬롯 ${i + 1}, 배치 ${displayText} — 탭하면 풀로 복귀`
                  : `슬롯 ${i + 1} 비어있음 — 탭하면 활성 카드 배치`
              }
              className={[
                "flex h-16 w-16 items-center justify-center rounded-block border text-display transition-colors disabled:opacity-60",
                occupant
                  ? "border-type-primary bg-bg-block text-type-primary"
                  : "border-dashed border-border-hairline bg-bg-shell text-type-secondary",
              ].join(" ")}
            >
              {displayText ?? "?"}
            </button>
          </span>
        );
      })}
    </div>
  );
}
