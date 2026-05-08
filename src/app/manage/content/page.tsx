"use client";

// /manage/content — 콘텐츠 입력 (M4 본격 구현).
// 단계: 메커닉 선택 → 과목·단원 → form 입력 → 저장.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  deleteCard,
  loadCards,
  loadCurriculum,
  loadSubjects,
  newId,
  saveCard,
  type CustomBlankCard,
  type CustomCard,
  type CustomCardKind,
  type CustomCurriculum,
  type CustomMultipleChoiceCard,
  type CustomSubject,
  type CustomTypingCard,
  type CustomWordMatchCard,
} from "@/lib/core";
import { MechanicPicker } from "@/components/manage/MechanicPicker";
import { SubjectCurriculumPicker } from "@/components/manage/SubjectCurriculumPicker";
import { MultipleChoiceForm } from "@/components/manage/forms/MultipleChoiceForm";
import { BlankForm } from "@/components/manage/forms/BlankForm";
import { TypingForm } from "@/components/manage/forms/TypingForm";
import { WordMatchForm } from "@/components/manage/forms/WordMatchForm";

const KIND_LABEL: Record<CustomCardKind, string> = {
  "multiple-choice": "객관식",
  blank: "빈칸",
  typing: "타이핑",
  "word-match": "매칭",
};

type AnyDraft =
  | Partial<CustomMultipleChoiceCard>
  | Partial<CustomBlankCard>
  | Partial<CustomTypingCard>
  | Partial<CustomWordMatchCard>;

function isValid(kind: CustomCardKind, draft: AnyDraft): boolean {
  if (!draft.subjectId || !draft.curriculumId) return false;
  switch (kind) {
    case "multiple-choice": {
      const d = draft as Partial<CustomMultipleChoiceCard>;
      return (
        !!d.question?.trim() &&
        Array.isArray(d.choices) &&
        d.choices.length === 4 &&
        d.choices.every((c) => c.trim().length > 0) &&
        typeof d.correctIndex === "number"
      );
    }
    case "blank": {
      const d = draft as Partial<CustomBlankCard>;
      return (
        !!d.passage?.trim() &&
        d.passage.includes("___") &&
        Array.isArray(d.choices) &&
        d.choices.length === 4 &&
        d.choices.every((c) => c.trim().length > 0) &&
        typeof d.correctIndex === "number"
      );
    }
    case "typing": {
      const d = draft as Partial<CustomTypingCard>;
      return !!d.meaning?.trim() && !!d.answer?.trim();
    }
    case "word-match": {
      const d = draft as Partial<CustomWordMatchCard>;
      return (
        Array.isArray(d.pairs) &&
        d.pairs.length >= 4 &&
        d.pairs.length <= 8 &&
        d.pairs.every((p) => p.left.trim() && p.right.trim())
      );
    }
  }
}

function emptyDraft(kind: CustomCardKind): AnyDraft {
  const common = { difficulty: 3 as const };
  switch (kind) {
    case "multiple-choice":
      return { ...common, choices: ["", "", "", ""], correctIndex: 0 };
    case "blank":
      return { ...common, choices: ["", "", "", ""], correctIndex: 0 };
    case "typing":
      return common;
    case "word-match":
      return {
        ...common,
        pairs: [
          { left: "", right: "" },
          { left: "", right: "" },
          { left: "", right: "" },
          { left: "", right: "" },
        ],
      };
  }
}

export default function ContentPage() {
  const [subjects, setSubjects] = useState<CustomSubject[]>([]);
  const [curriculum, setCurriculum] = useState<CustomCurriculum[]>([]);
  const [cards, setCards] = useState<CustomCard[]>([]);
  const [kind, setKind] = useState<CustomCardKind | null>(null);
  const [draft, setDraft] = useState<AnyDraft>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSubjects(loadSubjects());
    setCurriculum(loadCurriculum());
    setCards(loadCards());
  }, []);

  function refreshCards() {
    setCards(loadCards());
  }

  function selectKind(k: CustomCardKind) {
    setKind(k);
    setDraft(emptyDraft(k));
  }

  function patchDraft(next: AnyDraft) {
    setDraft({ ...draft, ...next });
  }

  function commit() {
    if (!kind) return;
    if (!isValid(kind, draft)) return;
    const now = new Date().toISOString();
    const base = {
      id: newId(),
      subjectId: draft.subjectId!,
      curriculumId: draft.curriculumId!,
      difficulty: draft.difficulty ?? 3,
      hint: draft.hint,
      createdAt: now,
      updatedAt: now,
    };
    let card: CustomCard;
    if (kind === "multiple-choice") {
      const d = draft as Partial<CustomMultipleChoiceCard>;
      card = {
        ...base,
        kind: "multiple-choice",
        question: d.question!.trim(),
        choices: d.choices!.map((c) => c.trim()),
        correctIndex: d.correctIndex!,
      };
    } else if (kind === "blank") {
      const d = draft as Partial<CustomBlankCard>;
      card = {
        ...base,
        kind: "blank",
        passage: d.passage!.trim(),
        choices: d.choices!.map((c) => c.trim()),
        correctIndex: d.correctIndex!,
        rationale: d.rationale?.trim(),
      };
    } else if (kind === "typing") {
      const d = draft as Partial<CustomTypingCard>;
      card = {
        ...base,
        kind: "typing",
        meaning: d.meaning!.trim(),
        answer: d.answer!.trim(),
        pronunciation: d.pronunciation?.trim() || undefined,
      };
    } else {
      const d = draft as Partial<CustomWordMatchCard>;
      card = {
        ...base,
        kind: "word-match",
        pairs: d.pairs!.map((p) => ({
          left: p.left.trim(),
          right: p.right.trim(),
        })),
      };
    }
    saveCard(card);
    refreshCards();
    setToast("카드 저장됐어요. 게임 허브 또는 관리 → 내 게임에서 풀어볼 수 있어요");
    setDraft({ ...emptyDraft(kind), subjectId: draft.subjectId, curriculumId: draft.curriculumId });
    window.setTimeout(() => setToast(null), 3000);
  }

  function remove(id: string) {
    if (!window.confirm("이 카드를 삭제할까요?")) return;
    deleteCard(id);
    refreshCards();
  }

  const valid = kind ? isValid(kind, draft) : false;

  const filteredCards = useMemo(() => cards.slice().reverse(), [cards]);

  if (subjects.length === 0) {
    return (
      <div className="rounded-block border border-dashed border-border-hairline bg-bg-block p-8 text-center">
        <h2 className="text-base font-bold text-type-primary">먼저 과목을 만들어주세요</h2>
        <p className="mt-2 text-helper text-type-secondary">
          관리 → 과목 에서 첫 과목을 만든 뒤 카드를 입력할 수 있어요.
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
      {/* 메커닉 선택 */}
      <section>
        <h2 className="text-label font-bold text-type-primary">
          1. 메커닉 고르기
        </h2>
        <p className="mt-1 text-helper text-type-secondary">
          텍스트만으로 만들 수 있는 4 메커닉. manipulation·sorting 은 V0.6+ 검토.
        </p>
        <div className="mt-3">
          <MechanicPicker value={kind} onChange={selectKind} />
        </div>
      </section>

      {/* 과목/단원 */}
      {kind && (
        <section>
          <h2 className="text-label font-bold text-type-primary">2. 과목·단원</h2>
          <div className="mt-3">
            <SubjectCurriculumPicker
              subjects={subjects}
              curriculum={curriculum}
              subjectId={(draft as { subjectId?: string }).subjectId ?? null}
              curriculumId={(draft as { curriculumId?: string }).curriculumId ?? null}
              onSubjectChange={(id) =>
                patchDraft({ subjectId: id, curriculumId: undefined } as AnyDraft)
              }
              onCurriculumChange={(id) =>
                patchDraft({ curriculumId: id } as AnyDraft)
              }
            />
          </div>
        </section>
      )}

      {/* form */}
      {kind && draft.subjectId && draft.curriculumId && (
        <section>
          <h2 className="text-label font-bold text-type-primary">
            3. 내용 입력 — {KIND_LABEL[kind]}
          </h2>
          <div className="mt-3">
            {kind === "multiple-choice" && (
              <MultipleChoiceForm
                draft={draft as Partial<CustomMultipleChoiceCard>}
                onChange={(d) => setDraft({ ...draft, ...d } as AnyDraft)}
              />
            )}
            {kind === "blank" && (
              <BlankForm
                draft={draft as Partial<CustomBlankCard>}
                onChange={(d) => setDraft({ ...draft, ...d } as AnyDraft)}
              />
            )}
            {kind === "typing" && (
              <TypingForm
                draft={draft as Partial<CustomTypingCard>}
                onChange={(d) => setDraft({ ...draft, ...d } as AnyDraft)}
              />
            )}
            {kind === "word-match" && (
              <WordMatchForm
                draft={draft as Partial<CustomWordMatchCard>}
                onChange={(d) => setDraft({ ...draft, ...d } as AnyDraft)}
              />
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-helper text-type-secondary">
              난이도{" "}
              <select
                value={draft.difficulty ?? 3}
                onChange={(e) =>
                  patchDraft({
                    difficulty: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                  } as AnyDraft)
                }
                className="ml-1 rounded-button border border-border-hairline bg-bg-block px-2 py-1 text-helper text-type-primary"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </p>
            <button
              type="button"
              onClick={commit}
              disabled={!valid}
              className="rounded-button border border-type-primary bg-bg-block px-4 py-2 text-body font-medium text-type-primary hover:bg-accent-positive/10 disabled:opacity-50"
            >
              저장하기
            </button>
          </div>
        </section>
      )}

      {/* toast */}
      {toast && (
        <div
          role="status"
          className="rounded-block border border-accent-positive bg-accent-positive/10 p-3 text-helper text-type-primary"
        >
          {toast}
        </div>
      )}

      {/* 카드 리스트 */}
      <section>
        <h2 className="text-label font-bold text-type-primary">
          내 카드 ({cards.length})
        </h2>
        {filteredCards.length === 0 ? (
          <p className="mt-2 rounded-block border border-dashed border-border-hairline bg-bg-block p-4 text-center text-helper text-type-secondary">
            아직 만든 카드가 없어요.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {filteredCards.slice(0, 30).map((c) => {
              const sub = subjects.find((s) => s.id === c.subjectId);
              const curr = curriculum.find((cu) => cu.id === c.curriculumId);
              const summary =
                c.kind === "multiple-choice"
                  ? c.question
                  : c.kind === "blank"
                    ? c.passage.slice(0, 60) + (c.passage.length > 60 ? "…" : "")
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
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label="카드 삭제"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {filteredCards.length > 30 && (
          <p className="mt-2 text-helper text-type-secondary">
            최근 30개만 표시 — 전체 {filteredCards.length}개
          </p>
        )}
      </section>
    </div>
  );
}
