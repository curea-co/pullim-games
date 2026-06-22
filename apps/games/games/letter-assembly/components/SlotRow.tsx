// 슬롯 행 — 좌→우 배치. 슬롯 탭 = active 카드 배치 또는 풀로 복귀.
// 슬롯 사이 "+" 표시로 조합 시각 강조.

import type { ComponentCard, Slot } from "../schema";

interface SlotRowProps {
  slots: Slot[];
  /** slotId → 배치된 카드. */
  placements: Map<string, ComponentCard | null>;
  disabled: boolean;
  onSlotTap: (slotId: string) => void;
}

export function SlotRow({
  slots,
  placements,
  disabled,
  onSlotTap,
}: SlotRowProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {slots.map((slot, i) => {
        const occupant = placements.get(slot.id) ?? null;
        return (
          <span key={slot.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSlotTap(slot.id)}
              disabled={disabled}
              aria-label={
                occupant
                  ? `슬롯 ${i + 1}, 배치 ${occupant.text} — 탭하면 풀로 복귀`
                  : `슬롯 ${i + 1} 비어있음 — 탭하면 활성 카드 배치`
              }
              className={[
                "flex h-16 w-16 items-center justify-center rounded-block border text-display transition-colors disabled:opacity-60",
                occupant
                  ? "border-type-primary bg-bg-block text-type-primary"
                  : "border-dashed border-border-hairline bg-bg-shell text-type-secondary",
              ].join(" ")}
            >
              {occupant?.text ?? "?"}
            </button>
            {i < slots.length - 1 && (
              <span
                className="text-display text-type-secondary"
                aria-hidden="true"
              >
                +
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
