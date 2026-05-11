"use client";

// 변환 결과 카드 미리보기 — shadcn Card + Checkbox + Button + RadioGroup.

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { CustomCardKind } from "@/lib/core";
import { cn } from "@/lib/utils";

export type PreviewDraft = {
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
    <Card
      className={cn(
        "rounded-block border bg-bg-block p-3 shadow-none transition-colors",
        selected
          ? "border-type-primary"
          : "border-border-hairline opacity-60",
      )}
    >
      <header className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label="이 카드 선택"
          className="mt-1 h-4 w-4 shrink-0 border-border-hairline data-[state=checked]:border-accent-positive data-[state=checked]:bg-accent-positive data-[state=checked]:text-bg-block"
        />
        <div className="min-w-0 flex-1">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={editing ? onCancelEdit : onStartEdit}
            aria-label="수정"
            className="h-7 w-7 rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="삭제"
            className="h-7 w-7 rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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
    </Card>
  );
}

function renderSummary(kind: CustomCardKind, d: PreviewDraft): string {
  if (kind === "multiple-choice") {
    return `Q: ${d.question ?? ""} → 정답 ${
      ["A", "B", "C", "D"][d.correctIndex as number] ?? "?"
    }) ${
      Array.isArray(d.choices)
        ? (d.choices as string[])[d.correctIndex as number]
        : ""
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
    return `${pairs.length} 짝${
      pairs.length > 0
        ? ` · 예: ${pairs[0]!.left} ↔ ${pairs[0]!.right}`
        : ""
    }`;
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
  if (kind === "typing") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <Input
          type="text"
          value={String(draft.answer ?? "")}
          onChange={(e) => onSave({ ...draft, answer: e.target.value })}
          placeholder="정답"
          className="rounded-button border-border-hairline bg-bg-block text-helper text-type-primary"
        />
        <Input
          type="text"
          value={String(draft.meaning ?? "")}
          onChange={(e) => onSave({ ...draft, meaning: e.target.value })}
          placeholder="뜻"
          className="rounded-button border-border-hairline bg-bg-block text-helper text-type-primary"
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
        <Input
          type="text"
          value={String(draft.question ?? "")}
          onChange={(e) => onSave({ ...draft, question: e.target.value })}
          placeholder="질문"
          className="rounded-button border-border-hairline bg-bg-block text-helper text-type-primary"
        />
        <RadioGroup
          value={String(correctIndex)}
          onValueChange={(v) => onSave({ ...draft, correctIndex: Number(v) })}
          className="flex flex-col gap-2"
        >
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <RadioGroupItem
                value={String(i)}
                id={`choice-${i}`}
                aria-label={`보기 ${i + 1} 정답`}
                className="h-3.5 w-3.5 border-border-hairline text-accent-positive"
              />
              <Label htmlFor={`choice-${i}`} className="sr-only">
                보기 {i + 1} 정답
              </Label>
              <Input
                type="text"
                value={c}
                onChange={(e) => {
                  const next = [...choices];
                  next[i] = e.target.value;
                  onSave({ ...draft, choices: next });
                }}
                placeholder={`보기 ${i + 1}`}
                className="flex-1 rounded-button border-border-hairline bg-bg-block text-helper text-type-primary"
              />
            </div>
          ))}
        </RadioGroup>
        <DoneRow onCancel={onCancel} />
      </div>
    );
  }
  if (kind === "blank") {
    const choices = (draft.choices as string[]) ?? ["", "", "", ""];
    return (
      <div className="mt-3 flex flex-col gap-2">
        <Textarea
          value={String(draft.passage ?? "")}
          onChange={(e) => onSave({ ...draft, passage: e.target.value })}
          rows={3}
          placeholder="본문 (___ 자리에 빈칸)"
          className="rounded-button border-border-hairline bg-bg-block text-helper text-type-primary"
        />
        {choices.map((c, i) => (
          <Input
            key={i}
            type="text"
            value={c}
            onChange={(e) => {
              const next = [...choices];
              next[i] = e.target.value;
              onSave({ ...draft, choices: next });
            }}
            placeholder={i === 0 ? "정답" : `오답 ${i}`}
            className="rounded-button border-border-hairline bg-bg-block text-helper text-type-primary"
          />
        ))}
        <DoneRow onCancel={onCancel} />
      </div>
    );
  }
  // word-match
  const pairs = ((draft.pairs as { left: string; right: string }[]) ?? []).map(
    (p) => ({ ...p }),
  );
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {pairs.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            type="text"
            value={p.left}
            onChange={(e) => {
              const next = pairs.map((q, idx) =>
                idx === i ? { ...q, left: e.target.value } : q,
              );
              onSave({ ...draft, pairs: next });
            }}
            className="h-8 flex-1 rounded-button border-border-hairline bg-bg-block px-2 text-helper text-type-primary"
          />
          <span aria-hidden="true" className="text-type-secondary">
            ↔
          </span>
          <Input
            type="text"
            value={p.right}
            onChange={(e) => {
              const next = pairs.map((q, idx) =>
                idx === i ? { ...q, right: e.target.value } : q,
              );
              onSave({ ...draft, pairs: next });
            }}
            className="h-8 flex-1 rounded-button border-border-hairline bg-bg-block px-2 text-helper text-type-primary"
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        className="rounded-button border-border-hairline bg-bg-block text-helper text-type-secondary hover:text-type-primary"
      >
        편집 끝
      </Button>
    </div>
  );
}
