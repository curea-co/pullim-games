// 본문 인라인 표시 — 일반 텍스트와 빈칸 슬롯이 섞임.
// 빈칸 슬롯은 버튼으로 탭하면 active 카드 배치 또는 배치된 카드 풀로 복귀.

import type { ClozeCard, PassageToken } from "../schema";

interface ClozePassageProps {
  passage: PassageToken[];
  /** slotId → 배치된 카드 (없으면 null). */
  placements: Map<string, ClozeCard | null>;
  /** 현재 hover 대상 슬롯 id (active 카드가 있을 때만 의미). */
  activeSlotId: string | null;
  disabled: boolean;
  onSlotTap: (slotId: string) => void;
}

export function ClozePassage({
  passage,
  placements,
  activeSlotId,
  disabled,
  onSlotTap,
}: ClozePassageProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 leading-loose">
      {passage.map((token, i) =>
        token.kind === "text" ? (
          <span
            key={`t-${i}`}
            className="text-body text-type-primary"
          >
            {token.text}
          </span>
        ) : (
          <button
            key={`b-${token.slotId}`}
            type="button"
            onClick={() => onSlotTap(token.slotId)}
            disabled={disabled}
            aria-label={(() => {
              const c = placements.get(token.slotId);
              return c
                ? `빈칸 ${token.slotId}, 배치 ${c.text} — 탭하면 풀로 복귀`
                : `빈칸 ${token.slotId} — 미배치, 탭하면 활성 카드 배치`;
            })()}
            className={[
              "min-w-[88px] rounded-block border px-3 py-1.5 text-body tabular transition-colors disabled:opacity-60",
              placements.get(token.slotId)
                ? "border-type-primary bg-bg-block text-type-primary"
                : "border-dashed border-border-hairline bg-bg-shell text-type-secondary",
              activeSlotId === token.slotId
                ? "ring-2 ring-offset-1 ring-type-primary"
                : "",
            ].join(" ")}
          >
            {placements.get(token.slotId)?.text ?? "____"}
          </button>
        ),
      )}
    </div>
  );
}
