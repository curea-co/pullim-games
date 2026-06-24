// 카탈로그 로더 — NCIC 2022 4-depth 트리 (학교급 → 과목 → 학년 → 단원).
// spec/06 §6.10. seed-loader 와 병행 — seed 는 vocabulary 풍부 fallback,
// catalog 는 메타+성취기준 으로 LLM 컨텍스트 공급.

import elementaryEnglishGrade4 from "./elementary/english/grade-4.json";
import elementaryEnglishGrade5 from "./elementary/english/grade-5.json";
import elementaryEnglishGrade6 from "./elementary/english/grade-6.json";
import middleEnglishGrade1 from "./middle/english/grade-1.json";
import middleEnglishGrade2 from "./middle/english/grade-2.json";
import middleMathGrade1 from "./middle/math/grade-1.json";
import middleMathGrade2 from "./middle/math/grade-2.json";
import middleKoreanGrade1 from "./middle/korean/grade-1.json";
import middleKoreanGrade2 from "./middle/korean/grade-2.json";
import highMathGrade1 from "./high/math/grade-1.json";
import type {
  CatalogGradeBand,
  CatalogGradeFile,
  CatalogPath,
  CatalogSubject,
  CatalogUnit,
  GradeBand,
} from "./types";

// JSON import 는 TS 타입 추론이 약하므로 명시 cast.
const FILES: CatalogGradeFile[] = [
  elementaryEnglishGrade4 as CatalogGradeFile,
  elementaryEnglishGrade5 as CatalogGradeFile,
  elementaryEnglishGrade6 as CatalogGradeFile,
  middleEnglishGrade1 as CatalogGradeFile,
  middleEnglishGrade2 as CatalogGradeFile,
  middleMathGrade1 as CatalogGradeFile,
  middleMathGrade2 as CatalogGradeFile,
  middleKoreanGrade1 as CatalogGradeFile,
  middleKoreanGrade2 as CatalogGradeFile,
  highMathGrade1 as CatalogGradeFile,
];

const GRADE_BAND_NAME: Record<GradeBand, string> = {
  elementary: "초등",
  middle: "중학교",
  high: "고등학교",
};

const SUBJECT_NAME: Record<CatalogSubject, string> = {
  english: "영어",
  math: "수학",
  korean: "국어",
  science: "과학",
  social: "사회",
};

/** 학교급 → 과목 → 학년 → 단원 4-depth 트리로 묶어 반환. picker UI 용. */
export function listCatalog(): CatalogGradeBand[] {
  const byBand = new Map<GradeBand, CatalogGradeBand>();
  for (const file of FILES) {
    let band = byBand.get(file.gradeBand);
    if (!band) {
      band = {
        gradeBand: file.gradeBand,
        gradeBandName: GRADE_BAND_NAME[file.gradeBand],
        subjects: [],
      };
      byBand.set(file.gradeBand, band);
    }
    let subject = band.subjects.find((s) => s.subject === file.subject);
    if (!subject) {
      subject = {
        subject: file.subject,
        subjectName: SUBJECT_NAME[file.subject],
        grades: [],
      };
      band.subjects.push(subject);
    }
    subject.grades.push({
      grade: file.grade,
      gradeName: file.gradeName,
      units: file.units,
    });
  }
  // 학년 오름차순 정렬
  for (const band of byBand.values()) {
    for (const subject of band.subjects) {
      subject.grades.sort((a, b) => a.grade - b.grade);
    }
  }
  return [...byBand.values()];
}

const UNIT_INDEX = new Map<string, CatalogUnit>();
function pathKey(p: CatalogPath): string {
  return `${p.gradeBand}::${p.subject}::${p.grade}::${p.unitId}`;
}
for (const file of FILES) {
  for (const unit of file.units) {
    UNIT_INDEX.set(
      pathKey({
        gradeBand: file.gradeBand,
        subject: file.subject,
        grade: file.grade,
        unitId: unit.unitId,
      }),
      unit,
    );
  }
}

/** 특정 path 의 단원 조회. */
export function findCatalogUnit(path: CatalogPath): CatalogUnit | undefined {
  return UNIT_INDEX.get(pathKey(path));
}

/** path 의 학년 메타 (gradeBand·subject·grade 컨텍스트 LLM 으로 넘길 때). */
export function findCatalogGradeContext(
  path: Pick<CatalogPath, "gradeBand" | "subject" | "grade">,
): { gradeBandName: string; subjectName: string; gradeName: string } | undefined {
  const file = FILES.find(
    (f) =>
      f.gradeBand === path.gradeBand &&
      f.subject === path.subject &&
      f.grade === path.grade,
  );
  if (!file) return undefined;
  return {
    gradeBandName: GRADE_BAND_NAME[file.gradeBand],
    subjectName: SUBJECT_NAME[file.subject],
    gradeName: file.gradeName,
  };
}
