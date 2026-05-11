"use client";

// 과목 + 단원 선택 — shadcn Select 두 개.

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const noUnits = !!subjectId && filteredCurriculum.length === 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label className="text-helper text-type-secondary">과목</Label>
        <Select value={subjectId ?? ""} onValueChange={onSubjectChange}>
          <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary">
            <SelectValue placeholder="선택해주세요" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-helper text-type-secondary">단원</Label>
        <Select
          value={curriculumId ?? ""}
          onValueChange={onCurriculumChange}
          disabled={!subjectId || noUnits}
        >
          <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary disabled:opacity-50">
            <SelectValue
              placeholder={
                !subjectId
                  ? "과목을 먼저 골라주세요"
                  : noUnits
                    ? "단원이 없어요"
                    : "선택해주세요"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {filteredCurriculum.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
