"use client";

// 내장 교육과정 카탈로그에서 과목 → 단원 cascade.
// localStorage 의 사용자 과목/단원 (CustomSubject) 와는 별도. 이건 자동 생성 SOURCE.

import type { SeedSubjectMeta } from "@/lib/core";

interface Props {
  catalog: SeedSubjectMeta[];
  subjectId: string | null;
  unitId: string | null;
  onSubjectChange: (id: string) => void;
  onUnitChange: (id: string) => void;
}

export function CurriculumPicker({
  catalog,
  subjectId,
  unitId,
  onSubjectChange,
  onUnitChange,
}: Props) {
  const subject = catalog.find((s) => s.subjectId === subjectId);
  const units = subject?.units ?? [];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">과목</span>
        <select
          value={subjectId ?? ""}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary focus:border-type-primary focus:outline-none"
        >
          <option value="" disabled>
            선택해주세요
          </option>
          {catalog.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">단원</span>
        <select
          value={unitId ?? ""}
          onChange={(e) => onUnitChange(e.target.value)}
          disabled={!subjectId || units.length === 0}
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary focus:border-type-primary focus:outline-none disabled:opacity-50"
        >
          <option value="" disabled>
            {!subjectId
              ? "과목을 먼저 골라주세요"
              : units.length === 0
                ? "준비 중인 과목이에요"
                : "선택해주세요"}
          </option>
          {units.map((u) => (
            <option key={u.unitId} value={u.unitId}>
              {u.unitName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
