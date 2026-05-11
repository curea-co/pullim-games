"use client";

// 자유로운 자료 paste — 형식 안내 X. 글자수만 노출.

interface Props {
  value: string;
  onChange: (next: string) => void;
}

const SOFT_LIMIT = 8000;

export function RawMaterialInput({ value, onChange }: Props) {
  const over = value.length > SOFT_LIMIT;
  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="본문, 단어 리스트, 강의 노트 등 형식 자유롭게 붙여넣기"
        rows={10}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-block border border-border-hairline bg-bg-block px-3 py-2.5 font-mono text-helper leading-relaxed text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
      />
      <p className="flex items-center justify-between text-helper text-type-secondary">
        <span>{over ? `자료가 길어요 — 앞 ${SOFT_LIMIT}자만 사용해요` : "AI 가 자동으로 카드 형식으로 변환해요"}</span>
        <span className="tabular">{value.length} 글자</span>
      </p>
    </div>
  );
}
