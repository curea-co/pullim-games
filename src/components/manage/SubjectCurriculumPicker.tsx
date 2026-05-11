"use client";

// 과목 + 단원 선택 — drop-down 두 개.

import type { CustomCurriculum, CustomSubject } from "@/lib/core";

interface Props {
  subjects: CustomSubject[];
  curriculum: CustomCurriculum[];
  subjectId: string | null;
  curriculumId: string | null;
  onSubjectChange: (id: string) => void;
  onCurriculumChange: (id: string) => void;
}

export function SubjectCurriculumPicker({
  subjects,
  curriculum,
  subjectId,
  curriculumId,
  onSubjectChange,
  onCurriculumChange,
}: Props) {
  const filteredCurriculum = subjectId
    ? curriculum.filter((c) => c.subjectId === subjectId)
    : [];

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
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-helper text-type-secondary">단원</span>
        <select
          value={curriculumId ?? ""}
          onChange={(e) => onCurriculumChange(e.target.value)}
          disabled={!subjectId || filteredCurriculum.length === 0}
          className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary focus:border-type-primary focus:outline-none disabled:opacity-50"
        >
          <option value="" disabled>
            {!subjectId
              ? "과목을 먼저 골라주세요"
              : filteredCurriculum.length === 0
                ? "단원이 없어요"
                : "선택해주세요"}
          </option>
          {filteredCurriculum.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
