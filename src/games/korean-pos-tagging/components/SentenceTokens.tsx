// 문장 토큰 인라인 표시. 각 토큰 = 버튼 (탭하면 active 로). 태깅된 토큰은 품사 색 칠.
// active 토큰은 outline + thick border 로 강조.

import type { KoreanPos, Token } from "../schema";
import { POS_TOKEN_CLASS } from "./PalettePicker";

interface SentenceTokensProps {
  tokens: Token[];
  tagging: (KoreanPos | null)[];
  activeIndex: number | null;
  disabled: boolean;
  onSelect: (index: number) => void;
}

export function SentenceTokens({
  tokens,
  tagging,
  activeIndex,
  disabled,
  onSelect,
}: SentenceTokensProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
      {tokens.map((token, i) => {
        const pos = tagging[i] ?? null;
        const colorClass = pos
          ? POS_TOKEN_CLASS[pos]
          : "border-border-hairline bg-bg-block text-type-primary";
        const active = i === activeIndex;
        return (
          <button
            key={token.id}
            type="button"
            onClick={() => onSelect(i)}
            disabled={disabled}
            aria-pressed={active}
            aria-label={`${i + 1}번 토큰 ${token.text}${pos ? `, 품사 ${pos}` : ", 미태깅"}`}
            className={`rounded-block border px-2.5 py-1.5 text-body tabular transition-colors disabled:opacity-60 ${colorClass} ${
              active ? "ring-2 ring-offset-1 ring-type-primary" : ""
            }`}
          >
            {token.text}
          </button>
        );
      })}
    </div>
  );
}
