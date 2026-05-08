"use client";

// 변환 결과 카드 미리보기 — 체크박스 + 인라인 편집 + 삭제.

import { Pencil, Trash2 } from "lucide-react";
import type { CustomCardKind } from "@/lib/core";
import { cn } from "@/lib/utils";

export type PreviewDraft = {
  // partial 카드 — kind 별로 필요한 필드 집합
  [k: string]: unknown;
};

interface Props {
  kind: CustomCardKind;
  draft: PreviewDraft;
  selected: boolean;
  editing: boolean;
  onToggleSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (next: PreviewDraft) => void;
  onDelete: () => void;
}

const KIND_LABEL: Record<CustomCardKind, string> = {
  "multiple-choice": "객관식",
  blank: "빈칸",
  typing: "타이핑",
  "word-match": "매칭",
};

export function PreviewCard({
  kind,
  draft,
  selected,
  editing,
  onToggleSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: Props) {
  const summary = renderSummary(kind, draft);
  return (
    <article
      className={cn(
        "rounded-block border bg-bg-block p-3 transition-colors",
        selected
          ? "border-type-primary"
          : "border-border-hairline opacity-60",
      )}
    >
      <header className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label="이 카드 선택"
          className="mt-1 h-4 w-4 shrink-0 accent-accent-positive"
        />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-type-secondary">
            {KIND_LABEL[kind]}
          </span>
          {!editing && (
            <p className="mt-1 line-clamp-3 text-helper leading-relaxed text-type-primary">
              {summary}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={editing ? onCancelEdit : onStartEdit}
            aria-label="수정"
            className="inline-flex h-7 w-7 items-center justify-center rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="삭제"
            className="inline-flex h-7 w-7 items-center justify-center rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {editing && (
        <InlineEditor
          kind={kind}
          draft={draft}
          onSave={(next) => onSaveEdit(next)}
          onCancel={onCancelEdit}
        />
      )}
    </article>
  );
}

function renderSummary(kind: CustomCardKind, d: PreviewDraft): string {
  if (kind === "multiple-choice") {
    return `Q: ${d.question ?? ""} → 정답 ${
      ["A", "B", "C", "D"][d.correctIndex as number] ?? "?"
    }) ${
      Array.isArray(d.choices) ? (d.choices as string[])[d.correctIndex as number] : ""
    }`;
  }
  if (kind === "blank") {
    const passage = String(d.passage ?? "");
    return passage.length > 80 ? `${passage.slice(0, 80)}…` : passage;
  }
  if (kind === "typing") {
    return `${d.meaning ?? ""} → ${d.answer ?? ""}`;
  }
  if (kind === "word-match") {
    const pairs = Array.isArray(d.pairs)
      ? (d.pairs as { left: string; right: string }[])
      : [];
    return `${pairs.length} 짝${pairs.length > 0 ? ` · 예: ${pairs[0]!.left} ↔ ${pairs[0]!.right}` : ""}`;
  }
  return "";
}

interface InlineEditorProps {
  kind: CustomCardKind;
  draft: PreviewDraft;
  onSave: (next: PreviewDraft) => void;
  onCancel: () => void;
}

function InlineEditor({ kind, draft, onSave, onCancel }: InlineEditorProps) {
  // 단순 JSON 편집 form — 메커닉별 풀 form 은 폐기. 사용자가 수정해야 할 필드만 노출.
  // typing / multiple-choice 는 텍스트 input, blank/word-match 는 textarea.
  if (kind === "typing") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <input
          type="text"
          value={String(draft.answer ?? "")}
          onChange={(e) => onSave({ ...draft, answer: e.target.value })}
          placeholder="정답"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper text-type-primary"
        />
        <input
          type="text"
          value={String(draft.meaning ?? "")}
          onChange={(e) => onSave({ ...draft, meaning: e.target.value })}
          placeholder="뜻"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper text-type-primary"
        />
        <DoneRow onCancel={onCancel} />
      </div>
    );
  }
  if (kind === "multiple-choice") {
    const choices = (draft.choices as string[]) ?? ["", "", "", ""];
    const correctIndex = (draft.correctIndex as number) ?? 0;
    return (
      <div className="mt-3 flex flex-col gap-2">
        <input
          type="text"
          value={String(draft.question ?? "")}
          onChange={(e) => onSave({ ...draft, question: e.target.value })}
          placeholder="질문"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper text-type-primary"
        />
        {choices.map((c, i) => (
          <label key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={correctIndex === i}
              onChange={() => onSave({ ...draft, correctIndex: i })}
              aria-label={`보기 ${i + 1} 정답`}
              className="h-3.5 w-3.5 accent-accent-positive"
            />
            <input
              type="text"
              value={c}
              onChange={(e) => {
                const next = [...choices];
                next[i] = e.target.value;
                onSave({ ...draft, choices: next });
              }}
              placeholder={`보기 ${i + 1}`}
              className="flex-1 rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper text-type-primary"
            />
          </label>
        ))}
        <DoneRow onCancel={onCancel} />
      </div>
    );
  }
  if (kind === "blank") {
    const choices = (draft.choices as string[]) ?? ["", "", "", ""];
    return (
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={String(draft.passage ?? "")}
          onChange={(e) => onSave({ ...draft, passage: e.target.value })}
          rows={3}
          placeholder="본문 (___ 자리에 빈칸)"
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper text-type-primary"
        />
        {choices.map((c, i) => (
          <input
            key={i}
            type="text"
            value={c}
            onChange={(e) => {
              const next = [...choices];
              next[i] = e.target.value;
              onSave({ ...draft, choices: next });
            }}
            placeholder={i === 0 ? "정답" : `오답 ${i}`}
            className="rounded-button border border-border-hairline bg-bg-block px-3 py-1.5 text-helper text-type-primary"
          />
        ))}
        <DoneRow onCancel={onCancel} />
      </div>
    );
  }
  // word-match: 짝 리스트 inline
  const pairs = ((draft.pairs as { left: string; right: string }[]) ?? []).map(
    (p) => ({ ...p }),
  );
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {pairs.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="text"
            value={p.left}
            onChange={(e) => {
              const next = pairs.map((q, idx) =>
                idx === i ? { ...q, left: e.target.value } : q,
              );
              onSave({ ...draft, pairs: next });
            }}
            className="flex-1 rounded-button border border-border-hairline bg-bg-block px-2 py-1 text-helper text-type-primary"
          />
          <span aria-hidden="true" className="text-type-secondary">↔</span>
          <input
            type="text"
            value={p.right}
            onChange={(e) => {
              const next = pairs.map((q, idx) =>
                idx === i ? { ...q, right: e.target.value } : q,
              );
              onSave({ ...draft, pairs: next });
            }}
            className="flex-1 rounded-button border border-border-hairline bg-bg-block px-2 py-1 text-helper text-type-primary"
          />
        </div>
      ))}
      <DoneRow onCancel={onCancel} />
    </div>
  );
}

function DoneRow({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-button border border-border-hairline bg-bg-block px-2.5 py-1 text-helper text-type-secondary hover:text-type-primary"
      >
        편집 끝
      </button>
    </div>
  );
}
