// 품사 팔레트 — 7 버튼 (V0). 클릭 시 active 토큰에 품사 적용.
// 색깔: 명사/대명사 (blue/sky 계열), 동사 (emerald), 형용사 (amber), 관형사 (slate), 부사 (pink), 조사 (purple).

import type { KoreanPos } from "../schema";

interface PalettePickerProps {
  options: readonly KoreanPos[];
  disabled: boolean;
  onPick: (pos: KoreanPos) => void;
}

export function PalettePicker({
  options,
  disabled,
  onPick,
}: PalettePickerProps) {
  return (
    <div
      role="toolbar"
      aria-label="품사 팔레트"
      className="flex flex-wrap justify-center gap-2"
    >
      {options.map((pos) => (
        <button
          key={pos}
          type="button"
          onClick={() => onPick(pos)}
          disabled={disabled}
          aria-label={`품사 ${pos} 선택`}
          className={`rounded-button border px-3 py-2 text-body transition-colors disabled:opacity-50 ${POS_PALETTE_CLASS[pos]}`}
        >
          {pos}
        </button>
      ))}
    </div>
  );
}

export const POS_TOKEN_CLASS: Record<KoreanPos, string> = {
  명사: "bg-blue-100 text-blue-800 border-blue-300",
  대명사: "bg-sky-100 text-sky-800 border-sky-300",
  동사: "bg-emerald-100 text-emerald-800 border-emerald-300",
  형용사: "bg-amber-100 text-amber-800 border-amber-300",
  관형사: "bg-slate-100 text-slate-800 border-slate-300",
  부사: "bg-pink-100 text-pink-800 border-pink-300",
  조사: "bg-purple-100 text-purple-800 border-purple-300",
};

const POS_PALETTE_CLASS: Record<KoreanPos, string> = {
  명사: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100",
  대명사: "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100",
  동사: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  형용사: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  관형사: "border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100",
  부사: "border-pink-300 bg-pink-50 text-pink-800 hover:bg-pink-100",
  조사: "border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100",
};
