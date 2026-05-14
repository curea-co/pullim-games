// 카드 풀 — 미배치된 카드만 노출. 카드 탭 → active 토글.
// 배치된 카드는 본문 슬롯에 있으므로 풀에서 사라짐.

import type { ClozeCard } from "../schema";

interface CardPaletteProps {
  /** 풀에 남은 카드 (미배치). */
  available: ClozeCard[];
  activeCardId: string | null;
  disabled: boolean;
  onPick: (cardId: string) => void;
}

export function CardPalette({
  available,
  activeCardId,
  disabled,
  onPick,
}: CardPaletteProps) {
  return (
    <div
      role="toolbar"
      aria-label="카드 풀"
      className="flex flex-wrap justify-center gap-2"
    >
      {available.length === 0 ? (
        <span className="text-helper text-type-secondary">
          모든 카드가 배치됐어요
        </span>
      ) : (
        available.map((card) => {
          const active = card.id === activeCardId;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onPick(card.id)}
              disabled={disabled}
              aria-pressed={active}
              aria-label={`카드 ${card.text}${active ? " 선택됨" : ""}`}
              className={[
                "rounded-button border px-3 py-2 text-body transition-colors disabled:opacity-50",
                active
                  ? "border-type-primary bg-accent-positive/10 text-type-primary ring-2 ring-offset-1 ring-type-primary"
                  : "border-border-hairline bg-bg-block text-type-primary hover:bg-accent-positive/10",
              ].join(" ")}
            >
              {card.text}
            </button>
          );
        })
      )}
    </div>
  );
}
