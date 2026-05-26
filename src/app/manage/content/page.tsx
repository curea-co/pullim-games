"use client";

// /manage/content — 자동 생성 (Mode A: 교육과정 / Mode B: 자료).
// `2026-05-08_management-auto-generation.md` 본격 구현.
// 사용자는 형식을 학습할 필요 없음. picker 또는 자유 paste 만.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listSeedSubjects,
  loadCards,
  loadCurriculum,
  loadSubjects,
  newId,
  saveCard,
  type CustomBlankCard,
  type CustomCard,
  type CustomCardDraft,
  type CustomCardKind,
  type CustomCurriculum,
  type CustomMultipleChoiceCard,
  type CustomSubject,
  type CustomTypingCard,
  type CustomWordMatchCard,
  type SeedSubjectMeta,
} from "@/lib/core";
import { MechanicPicker } from "@/components/manage/MechanicPicker";
import { SubjectCurriculumPicker } from "@/components/manage/SubjectCurriculumPicker";
import {
  ModeToggle,
  type GenerateMode,
} from "@/components/manage/auto/ModeToggle";
import { CurriculumPicker } from "@/components/manage/auto/CurriculumPicker";
import { RawMaterialInput } from "@/components/manage/auto/RawMaterialInput";
import { GenerateButton } from "@/components/manage/auto/GenerateButton";
import { GenerationProgress } from "@/components/manage/auto/GenerationProgress";
import {
  PreviewCard,
  type PreviewDraft,
} from "@/components/manage/bulk/PreviewCard";
import {
  generateFromCurriculumAction,
  generateFromSourceAction,
} from "./actions";

const KIND_LABEL: Record<CustomCardKind, string> = {
  "multiple-choice": "객관식",
  blank: "빈칸",
  typing: "타이핑",
  "word-match": "매칭",
};

interface PreviewItem {
  uid: string;
  draft: PreviewDraft;
  selected: boolean;
  editing: boolean;
}

type GenState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export default function ContentPage() {
  // 사용자 (저장 대상) 데이터
  const [subjects, setSubjects] = useState<CustomSubject[]>([]);
  const [curriculum, setCurriculum] = useState<CustomCurriculum[]>([]);
  const [savedCards, setSavedCards] = useState<CustomCard[]>([]);

  // 폼 상태
  const [kind, setKind] = useState<CustomCardKind | null>(null);
  const [saveSubjectId, setSaveSubjectId] = useState<string | null>(null);
  const [saveCurriculumId, setSaveCurriculumId] = useState<string | null>(null);
  const [mode, setMode] = useState<GenerateMode>("curriculum");
  const [seedSubjectId, setSeedSubjectId] = useState<string | null>(null);
  const [seedUnitId, setSeedUnitId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [count, setCount] = useState(10);

  // 결과 상태
  const [genState, setGenState] = useState<GenState>({ kind: "idle" });
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // 카탈로그
  const seedCatalog = useMemo<SeedSubjectMeta[]>(
    () => listSeedSubjects(),
    [],
  );

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
    setSourceText("");
    setPreviews([]);
    setGenState({ kind: "idle" });
  }

  async function handleGenerate() {
    if (!kind) return;
    setGenState({ kind: "loading" });
    setPreviews([]);

    let result;
    if (mode === "curriculum") {
      if (!seedSubjectId || !seedUnitId) {
        setGenState({ kind: "error", message: "과목과 단원을 골라주세요." });
        return;
      }
      result = await generateFromCurriculumAction({
        kind,
        subjectId: seedSubjectId,
        unitId: seedUnitId,
        count,
      });
    } else {
      if (!sourceText.trim()) {
        setGenState({
          kind: "error",
          message: "자료를 붙여넣어 주세요.",
        });
        return;
      }
      result = await generateFromSourceAction({
        kind,
        sourceText,
        count,
      });
    }

    if (!result.ok || !result.drafts) {
      setGenState({
        kind: "error",
        message: result.error ?? "자동 생성에 실패했어요.",
      });
      return;
    }
    setPreviews(
      result.drafts.map((d) => ({
        uid: newId(),
        draft: d as PreviewDraft,
        selected: true,
        editing: false,
      })),
    );
    setGenState({ kind: "idle" });
  }

  function commitAll() {
    if (!kind || !saveSubjectId || !saveCurriculumId) return;
    const selected = previews.filter((p) => p.selected);
    if (selected.length === 0) return;
    const now = new Date().toISOString();
    let savedCount = 0;
    for (const item of selected) {
      const d = item.draft as CustomCardDraft;
      const base = {
        id: newId(),
        subjectId: saveSubjectId,
        curriculumId: saveCurriculumId,
        difficulty: d.difficulty ?? 3,
        createdAt: now,
        updatedAt: now,
      };
      let card: CustomCard | undefined;
      if (d.kind === "multiple-choice") {
        card = {
          ...base,
          kind: "multiple-choice",
          question: d.question.trim(),
          choices: d.choices.map((c) => c.trim()),
          correctIndex: d.correctIndex,
          hint: d.hint?.trim(),
        } as CustomMultipleChoiceCard;
      } else if (d.kind === "blank") {
        card = {
          ...base,
          kind: "blank",
          passage: d.passage.trim(),
          choices: d.choices.map((c) => c.trim()),
          correctIndex: d.correctIndex,
          rationale: d.rationale?.trim(),
        } as CustomBlankCard;
      } else if (d.kind === "typing") {
        card = {
          ...base,
          kind: "typing",
          answer: d.answer.trim(),
          meaning: d.meaning.trim(),
          pronunciation: d.pronunciation?.trim(),
        } as CustomTypingCard;
      } else {
        card = {
          ...base,
          kind: "word-match",
          pairs: d.pairs.map((p) => ({
            left: p.left.trim(),
            right: p.right.trim(),
          })),
        } as CustomWordMatchCard;
      }
      saveCard(card);
      savedCount += 1;
    }
    refreshSaved();
    setPreviews([]);
    setSourceText("");
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
          만든 카드가 저장될 폴더(과목·단원) 가 필요해요.
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

  const canGenerate =
    kind !== null &&
    saveSubjectId !== null &&
    saveCurriculumId !== null &&
    (mode === "curriculum"
      ? seedSubjectId !== null && seedUnitId !== null
      : sourceText.trim().length > 0);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="text-label font-bold text-type-primary">
          1. 게임 타입 고르기
        </h2>
        <p className="mt-1 text-helper text-type-secondary">
          만들고 싶은 게임 4종 중 하나를 선택하세요.
        </p>
        <div className="mt-3">
          <MechanicPicker value={kind} onChange={selectKind} />
        </div>
      </section>

      {kind && (
        <section>
          <h2 className="text-label font-bold text-type-primary">
            2. 어디에 저장할까요?
          </h2>
          <p className="mt-1 text-helper text-type-secondary">
            만든 카드가 들어갈 과목·단원을 골라주세요.
          </p>
          <div className="mt-3">
            <SubjectCurriculumPicker
              subjects={subjects}
              curriculum={curriculum}
              subjectId={saveSubjectId}
              curriculumId={saveCurriculumId}
              onSubjectChange={(id) => {
                setSaveSubjectId(id);
                setSaveCurriculumId(null);
              }}
              onCurriculumChange={(id) => setSaveCurriculumId(id)}
            />
          </div>
        </section>
      )}

      {kind && saveSubjectId && saveCurriculumId && (
        <section className="flex flex-col gap-3">
          <header>
            <h2 className="text-label font-bold text-type-primary">
              3. 자료 가져오기 — {KIND_LABEL[kind]}
            </h2>
            <p className="mt-1 text-helper text-type-secondary">
              교육과정에서 가져오거나, 직접 붙여넣어 AI 가 자동으로 카드를 만들어요.
            </p>
          </header>
          <ModeToggle value={mode} onChange={setMode} />

          {mode === "curriculum" ? (
            <CurriculumPicker
              catalog={seedCatalog}
              subjectId={seedSubjectId}
              unitId={seedUnitId}
              onSubjectChange={(id) => {
                setSeedSubjectId(id);
                setSeedUnitId(null);
              }}
              onUnitChange={(id) => setSeedUnitId(id)}
            />
          ) : (
            <RawMaterialInput value={sourceText} onChange={setSourceText} />
          )}

          <GenerateButton
            count={count}
            onCountChange={setCount}
            onGenerate={handleGenerate}
            disabled={!canGenerate}
            loading={genState.kind === "loading"}
          />

          {genState.kind === "loading" && (
            <GenerationProgress state={{ kind: "loading" }} />
          )}
          {genState.kind === "error" && (
            <GenerationProgress
              state={{
                kind: "error",
                message: genState.message,
                onRetry: handleGenerate,
              }}
            />
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
