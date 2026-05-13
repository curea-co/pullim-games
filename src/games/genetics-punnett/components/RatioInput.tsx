// 표현형 비율 입력 — chemistry-balance CoefAtom 패턴.
// 한 카테고리 = 한 줄 (라벨 + 단축표기 + +/- + 값).

interface RatioInputProps {
  index: number;
  label: string;
  shorthand: string;
  value: number;
  correct: boolean;
  disabled: boolean;
  onInc: () => void;
  onDec: () => void;
}

export function RatioInput({
  index,
  label,
  shorthand,
  value,
  correct,
  disabled,
  onInc,
  onDec,
}: RatioInputProps) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-block border px-3 py-2 transition-colors ${
        correct
          ? "border-accent-positive bg-accent-positive/10"
          : "border-border-hairline bg-bg-block"
      }`}
      aria-label={`${index + 1}번 표현형 ${label}`}
    >
      <div className="flex min-w-0 flex-col">
        <span className="text-body text-type-primary">{label}</span>
        <span className="text-helper tabular text-type-secondary">
          {shorthand}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDec}
          disabled={disabled}
          aria-label={`${label} 비율 감소`}
          className="rounded-button border border-border-hairline px-2 py-1 text-body text-type-secondary hover:text-type-primary disabled:opacity-50"
        >
          −
        </button>
        <span className="min-w-[1.5rem] text-center text-display tabular text-type-primary">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={disabled}
          aria-label={`${label} 비율 증가`}
          className="rounded-button border border-border-hairline px-2 py-1 text-body text-type-secondary hover:text-type-primary disabled:opacity-50"
        >
          +
        </button>
      </div>
    </li>
  );
}
