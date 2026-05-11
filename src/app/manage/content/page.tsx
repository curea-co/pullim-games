"use client";

// /manage/content — 자료 일괄 입력 (`2026-05-08_management-redesign.md` 본격 구현).
// 사용자는 카드를 직접 만들지 않고 자료(원본 텍스트) 를 붙여넣음 → 시스템이 카드로 자동 변환.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  loadCards,
  loadCurriculum,
  loadSubjects,
  newId,
  saveCard,
  parseTypingSource,
  parseMatchingSource,
  parseMultipleChoiceSource,
  parseBlankSource,
  type CustomBlankCard,
  type CustomCard,
  type CustomCardKind,
  type CustomCurriculum,
  type CustomMultipleChoiceCard,
  type CustomSubject,
  type CustomTypingCard,
  type CustomWordMatchCard,
  type ParseError,
} from "@/lib/core";
import { MechanicPicker } from "@/components/manage/MechanicPicker";
import { SubjectCurriculumPicker } from "@/components/manage/SubjectCurriculumPicker";
import {
  EXAMPLES,
  SourceFormatGuide,
} from "@/components/manage/bulk/SourceFormatGuide";
import { BulkSourceInput } from "@/components/manage/bulk/BulkSourceInput";
import {
  PreviewCard,
  type PreviewDraft,
} from "@/components/manage/bulk/PreviewCard";

const KIND_LABEL: Record<CustomCardKind, string> = {
  "multiple-choice": "객관식",
  blank: "빈칸",
  typing: "타이핑",
  "word-match": "매칭",
};

const PLACEHOLDER: Record<CustomCardKind, string> = {
  "multiple-choice":
    "Q: 질문\nA) 보기 1\nB) 보기 2\nC) 보기 3\nD) 보기 4\n정답: B",
  blank: "본문에 [정답|오답1|오답2|오답3] 마커",
  typing: "정답::뜻",
  "word-match": "왼쪽::오른쪽",
};

interface PreviewItem {
  uid: string;
  draft: PreviewDraft;
  selected: boolean;
  editing: boolean;
}

function parseFor(
  kind: CustomCardKind,
  source: string,
): { drafts: PreviewDraft[]; errors: ParseError[] } {
  if (kind === "typing") {
    const r = parseTypingSource(source);
    return { drafts: r.cards as PreviewDraft[], errors: r.errors };
  }
  if (kind === "word-match") {
    const r = parseMatchingSource(source);
    return { drafts: r.cards as PreviewDraft[], errors: r.errors };
  }
  if (kind === "multiple-choice") {
    const r = parseMultipleChoiceSource(source);
    return { drafts: r.cards as PreviewDraft[], errors: r.errors };
  }
  const r = parseBlankSource(source);
  return { drafts: r.cards as PreviewDraft[], errors: r.errors };
}

export default function ContentPage() {
  const [subjects, setSubjects] = useState<CustomSubject[]>([]);
  const [curriculum, setCurriculum] = useState<CustomCurriculum[]>([]);
  const [savedCards, setSavedCards] = useState<CustomCard[]>([]);
  const [kind, setKind] = useState<CustomCardKind | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSubjects(loadSubjects());
    setCurriculum(loadCurriculum());
    setSavedCards(loadCards());
  }, []);

  function refreshSaved() {
    setSavedCards(loadCards());
  }

  function selectKind(k: CustomCardKind) {
    setKind(k);
    setSource("");
    setPreviews([]);
    setErrors([]);
  }

  function handleSourceChange(next: string) {
    setSource(next);
    if (!kind) return;
    const { drafts, errors: errs } = parseFor(kind, next);
    setPreviews(
      drafts.map((d) => ({
        uid: newId(),
        draft: d,
        selected: true,
        editing: false,
      })),
    );
    setErrors(errs);
  }

  function fillExample() {
    if (!kind) return;
    handleSourceChange(EXAMPLES[kind]);
  }

  function commitAll() {
    if (!kind || !subjectId || !curriculumId) return;
    const selected = previews.filter((p) => p.selected);
    if (selected.length === 0) return;
    const now = new Date().toISOString();
    let savedCount = 0;
    for (const item of selected) {
      const d = item.draft;
      const base = {
        id: newId(),
        subjectId,
        curriculumId,
        difficulty: 3 as 1 | 2 | 3 | 4 | 5,
        createdAt: now,
        updatedAt: now,
      };
      let card: CustomCard | undefined;
      if (kind === "multiple-choice") {
        card = {
          ...base,
          kind: "multiple-choice",
          question: String(d.question ?? "").trim(),
          choices: (d.choices as string[]).map((c) => c.trim()),
          correctIndex: d.correctIndex as number,
        } as CustomMultipleChoiceCard;
      } else if (kind === "blank") {
        card = {
          ...base,
          kind: "blank",
          passage: String(d.passage ?? "").trim(),
          choices: (d.choices as string[]).map((c) => c.trim()),
          correctIndex: d.correctIndex as number,
          rationale: d.rationale ? String(d.rationale).trim() : undefined,
        } as CustomBlankCard;
      } else if (kind === "typing") {
        card = {
          ...base,
          kind: "typing",
          answer: String(d.answer ?? "").trim(),
          meaning: String(d.meaning ?? "").trim(),
          pronunciation: d.pronunciation
            ? String(d.pronunciation).trim()
            : undefined,
        } as CustomTypingCard;
      } else {
        card = {
          ...base,
          kind: "word-match",
          pairs: (d.pairs as { left: string; right: string }[]).map((p) => ({
            left: p.left.trim(),
            right: p.right.trim(),
          })),
        } as CustomWordMatchCard;
      }
      saveCard(card);
      savedCount += 1;
    }
    refreshSaved();
    setSource("");
    setPreviews([]);
    setErrors([]);
    setToast(
      `${savedCount}장 저장됐어요. 게임 허브의 "나만의 게임" 또는 관리 → 내 게임에서 풀 수 있어요`,
    );
    window.setTimeout(() => setToast(null), 3500);
  }

  function togglePreview(uid: string) {
    setPreviews((list) =>
      list.map((p) => (p.uid === uid ? { ...p, selected: !p.selected } : p)),
    );
  }

  function startEdit(uid: string) {
    setPreviews((list) =>
      list.map((p) => ({ ...p, editing: p.uid === uid ? !p.editing : false })),
    );
  }

  function cancelEdit(uid: string) {
    setPreviews((list) =>
      list.map((p) => (p.uid === uid ? { ...p, editing: false } : p)),
    );
  }

  function saveEdit(uid: string, next: PreviewDraft) {
    setPreviews((list) =>
      list.map((p) => (p.uid === uid ? { ...p, draft: next } : p)),
    );
  }

  function removePreview(uid: string) {
    setPreviews((list) => list.filter((p) => p.uid !== uid));
  }

  const selectedCount = useMemo(
    () => previews.filter((p) => p.selected).length,
    [previews],
  );

  if (subjects.length === 0) {
    return (
      <div className="rounded-block border border-dashed border-border-hairline bg-bg-block p-8 text-center">
        <h2 className="text-base font-bold text-type-primary">
          먼저 과목을 만들어주세요
        </h2>
        <p className="mt-2 text-helper text-type-secondary">
          관리 → 과목에서 첫 과목을 만든 뒤 자료를 입력할 수 있어요.
        </p>
        <Link
          href="/manage/subjects"
          className="mt-4 inline-flex items-center gap-1.5 rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
        >
          과목 만들기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="text-label font-bold text-type-primary">
          1. 메커닉 고르기
        </h2>
        <p className="mt-1 text-helper text-type-secondary">
          자료 형식이 메커닉마다 달라요. 텍스트만으로 만드는 4 메커닉.
        </p>
        <div className="mt-3">
          <MechanicPicker value={kind} onChange={selectKind} />
        </div>
      </section>

      {kind && (
        <section>
          <h2 className="text-label font-bold text-type-primary">2. 과목·단원</h2>
          <div className="mt-3">
            <SubjectCurriculumPicker
              subjects={subjects}
              curriculum={curriculum}
              subjectId={subjectId}
              curriculumId={curriculumId}
              onSubjectChange={(id) => {
                setSubjectId(id);
                setCurriculumId(null);
              }}
              onCurriculumChange={(id) => setCurriculumId(id)}
            />
          </div>
        </section>
      )}

      {kind && subjectId && curriculumId && (
        <section className="flex flex-col gap-3">
          <header>
            <h2 className="text-label font-bold text-type-primary">
              3. 자료 붙여넣기 — {KIND_LABEL[kind]}
            </h2>
            <p className="mt-1 text-helper text-type-secondary">
              형식대로 입력하면 카드가 자동으로 만들어져요.
            </p>
          </header>
          <SourceFormatGuide kind={kind} onFillExample={fillExample} />
          <BulkSourceInput
            value={source}
            onChange={handleSourceChange}
            placeholder={PLACEHOLDER[kind]}
          />
          {errors.length > 0 && (
            <div
              role="alert"
              className="rounded-block border border-accent-negative bg-accent-negative/10 p-3 text-helper text-type-primary"
            >
              <p className="font-bold">파싱 오류 {errors.length}개</p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="tabular">
                    {e.line > 0 ? `라인 ${e.line}: ` : ""}
                    {e.message}
                  </li>
                ))}
                {errors.length > 5 && <li>...외 {errors.length - 5}개</li>}
              </ul>
            </div>
          )}

          {previews.length > 0 && (
            <section className="flex flex-col gap-3">
              <header className="flex items-center justify-between">
                <h3 className="text-label font-bold text-type-primary">
                  4. 미리보기 — 카드 {previews.length}장 (선택 {selectedCount})
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviews([])}
                  className="text-helper text-type-secondary hover:text-type-primary"
                >
                  비우기
                </button>
              </header>
              <ul className="flex flex-col gap-2">
                {previews.map((item) => (
                  <li key={item.uid}>
                    <PreviewCard
                      kind={kind}
                      draft={item.draft}
                      selected={item.selected}
                      editing={item.editing}
                      onToggleSelect={() => togglePreview(item.uid)}
                      onStartEdit={() => startEdit(item.uid)}
                      onCancelEdit={() => cancelEdit(item.uid)}
                      onSaveEdit={(next) => saveEdit(item.uid, next)}
                      onDelete={() => removePreview(item.uid)}
                    />
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-0 -mx-4 border-t border-border-hairline bg-bg-primary/95 p-3 backdrop-blur">
                <button
                  type="button"
                  onClick={commitAll}
                  disabled={selectedCount === 0}
                  className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-body font-medium text-type-primary hover:bg-accent-positive/10 disabled:opacity-50"
                >
                  {selectedCount}장 저장하기
                </button>
              </div>
            </section>
          )}
        </section>
      )}

      {toast && (
        <div
          role="status"
          className="rounded-block border border-accent-positive bg-accent-positive/10 p-3 text-helper text-type-primary"
        >
          {toast}
        </div>
      )}

      <section>
        <h2 className="text-label font-bold text-type-primary">
          내 카드 ({savedCards.length})
        </h2>
        {savedCards.length === 0 ? (
          <p className="mt-2 rounded-block border border-dashed border-border-hairline bg-bg-block p-4 text-center text-helper text-type-secondary">
            아직 만든 카드가 없어요.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {savedCards
              .slice()
              .reverse()
              .slice(0, 30)
              .map((c) => {
                const sub = subjects.find((s) => s.id === c.subjectId);
                const curr = curriculum.find((cu) => cu.id === c.curriculumId);
                const summary =
                  c.kind === "multiple-choice"
                    ? c.question
                    : c.kind === "blank"
                      ? c.passage.slice(0, 60) +
                        (c.passage.length > 60 ? "…" : "")
                      : c.kind === "typing"
                        ? `${c.meaning} → ${c.answer}`
                        : `${c.pairs.length} 짝`;
                return (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-block border border-border-hairline bg-bg-block px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-helper text-type-secondary">
                        <span className="rounded-full bg-pullim-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-pullim-slate-600">
                          {KIND_LABEL[c.kind]}
                        </span>
                        <span>
                          {sub?.name ?? "?"} · {curr?.name ?? "?"} · 난이도{" "}
                          {c.difficulty}
                        </span>
                      </p>
                      <p className="mt-1 truncate text-label text-type-primary">
                        {summary}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
        {savedCards.length > 30 && (
          <p className="mt-2 text-helper text-type-secondary">
            최근 30개만 표시 — 전체 {savedCards.length}개
          </p>
        )}
      </section>
    </div>
  );
}
