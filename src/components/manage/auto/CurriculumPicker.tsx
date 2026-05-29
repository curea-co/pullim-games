"use client";

// 교육과정 통합 4-depth picker — 학교급 → 과목 → 학년 → 단원.
// spec/06 §6.10 + plan: 2026-05-27_curriculum-ai-content-creation.md
//
// 단원 선택 시:
//   - 단원이 seedRef 를 가지면 "정적 변환(빠름) / AI 생성(다양)" 서브토글 노출
//   - 그렇지 않으면 항상 AI 생성
//   - 성취기준 + 핵심 어휘·문법 요약 노출 (LLM 컨텍스트 미리보기 = 사용자 신뢰)
//
// 기존 2-depth seed-only picker + 별도 CatalogPicker 를 합쳐 단일 picker 로.

import { BookOpen, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  CatalogGradeBand,
  CatalogPath,
  CatalogSubject,
  CatalogUnit,
  GradeBand,
} from "@/lib/core";

export type CurriculumSubMode = "seed" | "ai";

interface Props {
  catalog: CatalogGradeBand[];
  path: Partial<CatalogPath>;
  onChange: (next: Partial<CatalogPath>) => void;
  /** 선택된 단원 메타 (성취기준 + seedRef 판별용). */
  selectedUnit?: CatalogUnit;
  /** 단원에 seedRef 가 있을 때만 의미. 항상 controlled. */
  subMode: CurriculumSubMode;
  onSubModeChange: (m: CurriculumSubMode) => void;
}

export function CurriculumPicker({
  catalog,
  path,
  onChange,
  selectedUnit,
  subMode,
  onSubModeChange,
}: Props) {
  const band = catalog.find((b) => b.gradeBand === path.gradeBand);
  const subject = band?.subjects.find((s) => s.subject === path.subject);
  const grade = subject?.grades.find((g) => g.grade === path.grade);
  const hasSeed = !!selectedUnit?.seedRef;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-helper text-type-secondary">학교급</Label>
          <Select
            value={path.gradeBand ?? ""}
            onValueChange={(v) => onChange({ gradeBand: v as GradeBand })}
          >
            <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary">
              <SelectValue placeholder="고르기" />
            </SelectTrigger>
            <SelectContent>
              {catalog.map((b) => (
                <SelectItem key={b.gradeBand} value={b.gradeBand}>
                  {b.gradeBandName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-helper text-type-secondary">과목</Label>
          <Select
            value={path.subject ?? ""}
            onValueChange={(v) =>
              onChange({
                ...path,
                subject: v as CatalogSubject,
                grade: undefined,
                unitId: undefined,
              })
            }
            disabled={!band}
          >
            <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary disabled:opacity-50">
              <SelectValue placeholder={band ? "고르기" : "학교급 먼저"} />
            </SelectTrigger>
            <SelectContent>
              {band?.subjects.map((s) => (
                <SelectItem key={s.subject} value={s.subject}>
                  {s.subjectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-helper text-type-secondary">학년</Label>
          <Select
            value={path.grade != null ? String(path.grade) : ""}
            onValueChange={(v) =>
              onChange({ ...path, grade: Number(v), unitId: undefined })
            }
            disabled={!subject}
          >
            <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary disabled:opacity-50">
              <SelectValue placeholder={subject ? "고르기" : "과목 먼저"} />
            </SelectTrigger>
            <SelectContent>
              {subject?.grades.map((g) => (
                <SelectItem key={g.grade} value={String(g.grade)}>
                  {g.gradeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-helper text-type-secondary">단원</Label>
          <Select
            value={path.unitId ?? ""}
            onValueChange={(v) => onChange({ ...path, unitId: v })}
            disabled={!grade}
          >
            <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary disabled:opacity-50">
              <SelectValue placeholder={grade ? "고르기" : "학년 먼저"} />
            </SelectTrigger>
            <SelectContent>
              {grade?.units.map((u) => (
                <SelectItem key={u.unitId} value={u.unitId}>
                  {u.unitName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedUnit && (
        <>
          {hasSeed && (
            <ToggleGroup
              type="single"
              value={subMode}
              onValueChange={(v) => v && onSubModeChange(v as CurriculumSubMode)}
              aria-label="생성 방식"
              className="grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem
                value="seed"
                aria-label="정적 변환"
                className="flex h-auto flex-col items-start gap-1 rounded-block border border-border-hairline bg-bg-block p-3 text-left text-type-primary hover:border-type-primary/30 hover:bg-bg-block hover:text-type-primary data-[state=on]:border-type-primary data-[state=on]:bg-accent-positive/5"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-600">
                    <BookOpen className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-label font-bold text-type-primary">
                    정적 변환
                  </span>
                </span>
                <span className="text-helper font-normal text-type-secondary">
                  준비된 자료로 빠르게 (AI 안 씀)
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="ai"
                aria-label="AI 생성"
                className="flex h-auto flex-col items-start gap-1 rounded-block border border-border-hairline bg-bg-block p-3 text-left text-type-primary hover:border-type-primary/30 hover:bg-bg-block hover:text-type-primary data-[state=on]:border-type-primary data-[state=on]:bg-accent-positive/5"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-600">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-label font-bold text-type-primary">
                    AI 생성
                  </span>
                </span>
                <span className="text-helper font-normal text-type-secondary">
                  단원에 맞춰 매번 다르게
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          <div className="rounded-block border border-border-hairline bg-bg-block p-3 text-helper text-type-secondary">
            <p className="font-bold text-type-primary">
              성취기준 {selectedUnit.achievementCodes.join(", ")}
            </p>
            <p className="mt-1 leading-relaxed">{selectedUnit.achievementText}</p>
            {selectedUnit.focusVocab?.length ? (
              <p className="mt-1.5">
                <span className="font-bold text-type-primary">핵심 어휘:</span>{" "}
                {selectedUnit.focusVocab.join(", ")}
              </p>
            ) : null}
            {selectedUnit.focusGrammar?.length ? (
              <p className="mt-1">
                <span className="font-bold text-type-primary">핵심 문법:</span>{" "}
                {selectedUnit.focusGrammar.join(", ")}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
