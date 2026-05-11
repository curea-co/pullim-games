"use client";

import type { CustomTypingCard } from "@/lib/core";

interface Props {
  draft: Partial<CustomTypingCard>;
  onChange: (next: Partial<CustomTypingCard>) => void;
}

export function TypingForm({ draft, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">뜻풀이</span>
        <textarea
          value={draft.meaning ?? ""}
          onChange={(e) => onChange({ ...draft, meaning: e.target.value })}
          rows={2}
          placeholder="예: 앞뒤가 서로 맞지 않는 일"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">정답 (입력 그대로 검사)</span>
        <input
          type="text"
          value={draft.answer ?? ""}
          onChange={(e) => onChange({ ...draft, answer: e.target.value })}
          placeholder="예: 모순"
          autoComplete="off"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">
          한자 표기 (선택) — 정답 시 노출
        </span>
        <input
          type="text"
          value={draft.pronunciation ?? ""}
          onChange={(e) =>
            onChange({ ...draft, pronunciation: e.target.value })
          }
          placeholder="예: 矛盾"
          autoComplete="off"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
        />
      </label>
    </div>
  );
}
