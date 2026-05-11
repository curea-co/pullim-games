"use client";

// 자료 textarea + 글자 수 표시.

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function BulkSourceInput({ value, onChange, placeholder }: Props) {
  const lineCount = value ? value.split("\n").length : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={10}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-block border border-border-hairline bg-bg-block px-3 py-2.5 font-mono text-helper leading-relaxed text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
      />
      <p className="text-right text-helper tabular text-type-secondary">
        {value.length} 글자 · {lineCount} 줄
      </p>
    </div>
  );
}
