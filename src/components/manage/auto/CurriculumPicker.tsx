"use client";

// 내장 교육과정 카탈로그에서 과목 → 단원 cascade. shadcn Select.

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const noUnits = !!subjectId && units.length === 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label className="text-helper text-type-secondary">과목</Label>
        <Select value={subjectId ?? ""} onValueChange={onSubjectChange}>
          <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary">
            <SelectValue placeholder="선택해주세요" />
          </SelectTrigger>
          <SelectContent>
            {catalog.map((s) => (
              <SelectItem key={s.subjectId} value={s.subjectId}>
                {s.subjectName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-helper text-type-secondary">단원</Label>
        <Select
          value={unitId ?? ""}
          onValueChange={onUnitChange}
          disabled={!subjectId || noUnits}
        >
          <SelectTrigger className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary disabled:opacity-50">
            <SelectValue
              placeholder={
                !subjectId
                  ? "과목을 먼저 골라주세요"
                  : noUnits
                    ? "준비 중인 과목이에요"
                    : "선택해주세요"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.unitId} value={u.unitId}>
                {u.unitName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
