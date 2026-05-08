"use client";

import type { CustomBlankCard } from "@/lib/core";

interface Props {
  draft: Partial<CustomBlankCard>;
  onChange: (next: Partial<CustomBlankCard>) => void;
}

export function BlankForm({ draft, onChange }: Props) {
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
        <span className="text-helper text-type-secondary">
          본문 — 빈칸 자리에 ___ (밑줄 3개)
        </span>
        <textarea
          value={draft.passage ?? ""}
          onChange={(e) => onChange({ ...draft, passage: e.target.value })}
          rows={4}
          placeholder="예: Reading widely is one of the most effective ways to improve your vocabulary. The more you read, the more new words you ___, often without even noticing."
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body leading-relaxed text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
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

      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">
          해설 (선택) — 오답 시 한 줄로 보여줘요
        </span>
        <textarea
          value={draft.rationale ?? ""}
          onChange={(e) => onChange({ ...draft, rationale: e.target.value })}
          rows={2}
          placeholder="예: 새 단어를 자연스럽게 만나는 맥락 → encounter (마주치다)"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
        />
      </label>
    </div>
  );
}
