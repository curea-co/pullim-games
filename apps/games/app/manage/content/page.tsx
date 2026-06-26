"use client";

// /manage/content — 자동 생성.
//   Mode A "교육과정" = 통합 4-depth picker (학교급 → 과목 → 학년 → 단원).
//     - 단원이 seedRef 를 가지면 seed 정적 변환 (빠름) / AI 생성 (다양) 서브토글
//     - 그렇지 않으면 catalog 컨텍스트 + LLM 생성
//   Mode B "자료" = 사용자 paste 텍스트 + LLM 생성.
// spec/06 §6.10·§6.11·§6.12 + plan: 2026-05-27_curriculum-ai-content-creation.md

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DAILY_LIMIT,
  clearCachedDrafts,
  describeCacheAge,
  findCatalogUnit,
  getCachedDrafts,
  getLlmQuotaRemaining,
  incrementLlmQuota,
  isLlmQuotaExhausted,
  listCatalog,
  setCachedDrafts,
  loadCards,
  loadCurriculum,
  loadSubjects,
  newId,
  saveCard,
  type CatalogGradeBand,
  type CatalogPath,
  type CustomBlankCard,
  type CustomCard,
  type CustomCardDraft,
  type CustomCardKind,
  type CustomCurriculum,
  type CustomMultipleChoiceCard,
  type CustomSubject,
  type CustomTypingCard,
  type CustomWordMatchCard,
} from "@/lib/core";
import { MechanicPicker } from "@/components/manage/MechanicPicker";
import { SubjectCurriculumPicker } from "@/components/manage/SubjectCurriculumPicker";
import {
  ModeToggle,
  type GenerateMode,
} from "@/components/manage/auto/ModeToggle";
import {
  CurriculumPicker,
  type CurriculumSubMode,
} from "@/components/manage/auto/CurriculumPicker";
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

function isCatalogPathComplete(p: Partial<CatalogPath>): p is CatalogPath {
  return !!p.gradeBand && !!p.subject && p.grade != null && !!p.unitId;
}

export default function ContentPage() {
  const [subjects, setSubjects] = useState<CustomSubject[]>([]);
  const [curriculum, setCurriculum] = useState<CustomCurriculum[]>([]);
  const [savedCards, setSavedCards] = useState<CustomCard[]>([]);

  const [kind, setKind] = useState<CustomCardKind | null>(null);
  const [saveSubjectId, setSaveSubjectId] = useState<string | null>(null);
  const [saveCurriculumId, setSaveCurriculumId] = useState<string | null>(null);
  const [mode, setMode] = useState<GenerateMode>("curriculum");
  const [curriculumPath, setCurriculumPath] = useState<Partial<CatalogPath>>({});
  const [curriculumSubMode, setCurriculumSubMode] =
    useState<CurriculumSubMode>("seed");
  const [sourceText, setSourceText] = useState("");
  const [count, setCount] = useState(10);
  const [quotaRemaining, setQuotaRemaining] = useState(DAILY_LIMIT);

  const [genState, setGenState] = useState<GenState>({ kind: "idle" });
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  /** catalog-ai 분기에서 미리보기가 캐시에서 왔는지 (ISO 시각, null = 라이브 호출). */
  const [cacheLabel, setCacheLabel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 중등 재포지셔닝의 manage 콘텐츠 생성 밴드 제한(middle-only)은 **별도 콘텐츠 트랙으로 보류**:
  // 중등 전용 seed(현 factorization seed 는 x³·판별식·인수정리 등 고등 요소 포함, Codex #125 R16)
  // + 서버 액션 검증 + spec/06 카드풀 갱신이 함께 가야 정책이 데이터/서버 레벨에서 닫힌다.
  // 그 전까지는 picker 전체 밴드 유지(Codex #125 R13 — "중3 catalog/seed 준비 전엔 기존 진입 유지").
  // 후속: proc/plan/2026-06-23_middle-school-repositioning.md §1.1 콘텐츠 재보정.
  const courseCatalog = useMemo<CatalogGradeBand[]>(() => listCatalog(), []);
  const selectedCatalogUnit = useMemo(() => {
    if (!isCatalogPathComplete(curriculumPath)) return undefined;
    return findCatalogUnit(curriculumPath);
  }, [curriculumPath]);

  // 단원 변경 시 sub-mode 자동 조정 — 단원이 확정된 순간만 동작.
  // path 구축 중(selectedCatalogUnit === undefined)에 건드리면 학교급/과목/학년 픽 단계마다
  // subMode 가 "ai" 로 리셋돼 단원 확정 후에도 ai 가 박혀버림.
  useEffect(() => {
    if (!selectedCatalogUnit) return;
    setCurriculumSubMode(selectedCatalogUnit.seedRef ? "seed" : "ai");
  }, [selectedCatalogUnit]);

  useEffect(() => {
    setSubjects(loadSubjects());
    setCurriculum(loadCurriculum());
    setSavedCards(loadCards());
    setQuotaRemaining(getLlmQuotaRemaining());
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

  /** 현재 폼 상태가 LLM 호출을 유발하는지. */
  function willCallLlm(): boolean {
    if (mode === "source") return true;
    if (mode === "curriculum") {
      // seedRef 있으면 sub-mode 가 결정. 없으면 AI.
      if (!selectedCatalogUnit) return false;
      return curriculumSubMode === "ai" || !selectedCatalogUnit.seedRef;
    }
    return false;
  }

  /** catalog-ai 분기. forceFresh=true 면 캐시 무시하고 LLM 호출. */
  async function handleGenerate(forceFresh = false) {
    if (!kind) return;
    setGenState({ kind: "loading" });
    setPreviews([]);
    setCacheLabel(null);

    let result;
    if (mode === "curriculum") {
      if (!isCatalogPathComplete(curriculumPath) || !selectedCatalogUnit) {
        setGenState({
          kind: "error",
          message: "학교급·과목·학년·단원을 모두 골라주세요.",
        });
        return;
      }
      const useSeed =
        !!selectedCatalogUnit.seedRef && curriculumSubMode === "seed";
      if (useSeed) {
        result = await generateFromCurriculumAction({
          kind,
          count,
          seedSubjectId: selectedCatalogUnit.seedRef!.subjectId,
          seedUnitId: selectedCatalogUnit.seedRef!.unitId,
        });
      } else {
        // catalog-ai: 캐시 hit 우선 (forceFresh 시 무시)
        const cacheKey = {
          gradeBand: curriculumPath.gradeBand!,
          subject: curriculumPath.subject!,
          grade: curriculumPath.grade!,
          unitId: curriculumPath.unitId!,
          kind,
          count,
        };
        const cached = forceFresh ? null : getCachedDrafts(cacheKey);
        if (cached) {
          setPreviews(
            cached.drafts.map((d) => ({
              uid: newId(),
              draft: d as PreviewDraft,
              selected: true,
              editing: false,
            })),
          );
          setCacheLabel(`AI 캐시 · ${describeCacheAge(cached.savedAt)}`);
          setGenState({ kind: "idle" });
          return;
        }
        // 캐시 miss → quota 체크 → LLM 호출
        if (isLlmQuotaExhausted()) {
          setGenState({
            kind: "error",
            message: `오늘 AI 호출 한도(${DAILY_LIMIT}회) 를 다 썼어요. 내일 자정에 리셋돼요.`,
          });
          return;
        }
        result = await generateFromCurriculumAction({
          kind,
          count,
          catalogPath: curriculumPath,
        });
        if (result.ok && result.drafts) {
          incrementLlmQuota();
          setQuotaRemaining(getLlmQuotaRemaining());
          setCachedDrafts(cacheKey, result.drafts);
        }
      }
    } else {
      if (!sourceText.trim()) {
        setGenState({ kind: "error", message: "자료를 붙여넣어 주세요." });
        return;
      }
      if (isLlmQuotaExhausted()) {
        setGenState({
          kind: "error",
          message: `오늘 AI 호출 한도(${DAILY_LIMIT}회) 를 다 썼어요. 내일 자정에 리셋돼요.`,
        });
        return;
      }
      result = await generateFromSourceAction({ kind, sourceText, count });
      if (result.ok) {
        incrementLlmQuota();
        setQuotaRemaining(getLlmQuotaRemaining());
      }
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

  /** 캐시 무시하고 새로 LLM 호출 (사용자가 "다시 생성" 버튼 클릭 시). */
  function regenerateFresh() {
    if (!isCatalogPathComplete(curriculumPath)) return;
    clearCachedDrafts({
      gradeBand: curriculumPath.gradeBand!,
      subject: curriculumPath.subject!,
      grade: curriculumPath.grade!,
      unitId: curriculumPath.unitId!,
      kind: kind ?? "typing",
      count,
    });
    void handleGenerate(true);
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
        source: d.source ?? "manual",
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
      ? isCatalogPathComplete(curriculumPath)
      : sourceText.trim().length > 0);
  const usesLlm = willCallLlm();

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
              catalog={courseCatalog}
              path={curriculumPath}
              onChange={setCurriculumPath}
              selectedUnit={selectedCatalogUnit}
              subMode={curriculumSubMode}
              onSubModeChange={setCurriculumSubMode}
            />
          ) : (
            <RawMaterialInput value={sourceText} onChange={setSourceText} />
          )}

          {usesLlm && (
            <p className="text-helper text-type-secondary tabular">
              오늘 AI 호출 남음: {quotaRemaining} / {DAILY_LIMIT}
            </p>
          )}

          <GenerateButton
            count={count}
            onCountChange={setCount}
            onGenerate={() => handleGenerate()}
            disabled={!canGenerate || (usesLlm && quotaRemaining <= 0)}
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
                onRetry: () => handleGenerate(),
              }}
            />
          )}

          {previews.length > 0 && (
            <section className="flex flex-col gap-3">
              <header className="flex items-center justify-between gap-2">
                <h3 className="text-label font-bold text-type-primary">
                  4. 미리보기 — 카드 {previews.length}장 (선택 {selectedCount})
                </h3>
                <div className="flex items-center gap-2">
                  {cacheLabel && (
                    <span className="rounded-full bg-pullim-blue-50 px-2 py-0.5 text-[10px] font-bold text-pullim-blue-700">
                      {cacheLabel}
                    </span>
                  )}
                  {cacheLabel && (
                    <button
                      type="button"
                      onClick={regenerateFresh}
                      className="text-helper text-pullim-blue-700 hover:text-pullim-blue-500"
                    >
                      다시 생성
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviews([])}
                    className="text-helper text-type-secondary hover:text-type-primary"
                  >
                    비우기
                  </button>
                </div>
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
