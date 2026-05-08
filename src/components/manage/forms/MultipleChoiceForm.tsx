"use client";

import type { CustomMultipleChoiceCard } from "@/lib/core";

interface Props {
  draft: Partial<CustomMultipleChoiceCard>;
  onChange: (next: Partial<CustomMultipleChoiceCard>) => void;
}

export function MultipleChoiceForm({ draft, onChange }: Props) {
  const choices = draft.choices ?? ["", "", "", ""];
  const correctIndex = draft.correctIndex ?? 0;

  function setChoice(i: number, value: string) {
    const next = [...choices];
    next[i] = value;
    onChange({ ...draft, choices: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">질문</span>
        <textarea
          value={draft.question ?? ""}
          onChange={(e) => onChange({ ...draft, question: e.target.value })}
          rows={2}
          placeholder="예: x² + 5x + 6 의 인수분해는?"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-helper text-type-secondary">보기 4개</legend>
        {choices.map((c, i) => (
          <label key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctIndex"
              checked={correctIndex === i}
              onChange={() => onChange({ ...draft, correctIndex: i })}
              aria-label={`보기 ${i + 1} 정답`}
              className="h-4 w-4 accent-accent-positive"
            />
            <input
              type="text"
              value={c}
              onChange={(e) => setChoice(i, e.target.value)}
              placeholder={`보기 ${i + 1}`}
              className="flex-1 rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
            />
          </label>
        ))}
      </fieldset>

      <p className="text-helper text-type-secondary">
        선택된 정답: {correctIndex + 1}번
      </p>
    </div>
  );
}
