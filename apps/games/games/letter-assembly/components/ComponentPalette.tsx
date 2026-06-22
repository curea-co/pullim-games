// 부수 카드 풀 — 미배치 카드만 노출. 카드 탭 → active 토글.

import type { ComponentCard } from "../schema";

interface ComponentPaletteProps {
  available: ComponentCard[];
  activeCardId: string | null;
  disabled: boolean;
  onPick: (cardId: string) => void;
}

export function ComponentPalette({
  available,
  activeCardId,
  disabled,
  onPick,
}: ComponentPaletteProps) {
  return (
    <div
      role="toolbar"
      aria-label="부수 카드"
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
              aria-label={`부수 ${card.text}${card.label ? ` (${card.label})` : ""}${active ? " 선택됨" : ""}`}
              className={[
                "flex min-w-[56px] flex-col items-center gap-0.5 rounded-button border px-3 py-2 transition-colors disabled:opacity-50",
                active
                  ? "border-type-primary bg-accent-positive/10 text-type-primary ring-2 ring-offset-1 ring-type-primary"
                  : "border-border-hairline bg-bg-block text-type-primary hover:bg-accent-positive/10",
              ].join(" ")}
            >
              <span className="text-display leading-tight">{card.text}</span>
              {card.label && (
                <span className="text-helper text-type-secondary">
                  {card.label}
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
