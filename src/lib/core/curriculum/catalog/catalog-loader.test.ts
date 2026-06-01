import { describe, expect, it } from "vitest";
import {
  findCatalogGradeContext,
  findCatalogUnit,
  listCatalog,
} from "./catalog-loader";
import type { CustomCardKind } from "@/lib/core/custom/types";

// NCIC 2022 형식 — `[N영AA-NN]` (영어), `[10공수1-AA-NN]` (고등 공통수학) 등 과목별로 다름.
// 일반 검증은 "대괄호로 묶인 비어있지 않은 문자열" 만. 영어 학년군 prefix 는 별도 테스트에서.
const ACHIEVEMENT_CODE_RE = /^\[[^[\]]+\]$/;

describe("catalog-loader — listCatalog()", () => {
  it("V1.5 — 초등 + 중학교 + 고등 세 학교급 노출 (고등은 수학 인수분해 1개)", () => {
    const bands = listCatalog();
    const bandIds = bands.map((b) => b.gradeBand).sort();
    expect(bandIds).toEqual(["elementary", "high", "middle"]);
  });

  it("초등·중학교에 영어 과목 존재", () => {
    const bands = listCatalog();
    for (const band of bands.filter((b) => b.gradeBand !== "high")) {
      expect(band.subjects.some((s) => s.subject === "english")).toBe(true);
    }
  });

  it("V1.6 — 중학교에 영어·수학·국어 3 과목 노출", () => {
    const middle = listCatalog().find((b) => b.gradeBand === "middle");
    const subjects = middle?.subjects.map((s) => s.subject).sort();
    expect(subjects).toEqual(["english", "korean", "math"]);
  });

  it("고등 → 수학 → 1학년 → factorization 단원에 seedRef 존재", () => {
    const u = findCatalogUnit({
      gradeBand: "high",
      subject: "math",
      grade: 1,
      unitId: "factorization",
    });
    expect(u?.seedRef).toEqual({ subjectId: "math", unitId: "factorization" });
  });

  it("수학·국어 단원은 seedRef 없음 (catalog-ai 강제)", () => {
    const mathUnit = findCatalogUnit({
      gradeBand: "middle",
      subject: "math",
      grade: 1,
      unitId: "natural-numbers-properties",
    });
    const koreanUnit = findCatalogUnit({
      gradeBand: "middle",
      subject: "korean",
      grade: 2,
      unitId: "morpheme-word-formation",
    });
    expect(mathUnit?.seedRef).toBeUndefined();
    expect(koreanUnit?.seedRef).toBeUndefined();
  });

  it("초등 영어 = 3 학년 (4·5·6), 중학교 영어 = 2 학년 (1·2)", () => {
    const bands = listCatalog();
    const elem = bands
      .find((b) => b.gradeBand === "elementary")
      ?.subjects.find((s) => s.subject === "english");
    const mid = bands
      .find((b) => b.gradeBand === "middle")
      ?.subjects.find((s) => s.subject === "english");
    expect(elem?.grades.map((g) => g.grade)).toEqual([4, 5, 6]);
    expect(mid?.grades.map((g) => g.grade)).toEqual([1, 2]);
  });

  it("모든 단원의 unitId 가 같은 grade 안에서 unique", () => {
    const bands = listCatalog();
    for (const band of bands) {
      for (const subject of band.subjects) {
        for (const grade of subject.grades) {
          const ids = grade.units.map((u) => u.unitId);
          expect(new Set(ids).size, `${band.gradeBand}/${subject.subject}/${grade.grade}`).toBe(ids.length);
        }
      }
    }
  });
});

describe("catalog-loader — schema 검증", () => {
  it("모든 단원의 achievementCodes 가 NCIC 2022 형식 (예: [4영01-01])", () => {
    const bands = listCatalog();
    for (const band of bands) {
      for (const subject of band.subjects) {
        for (const grade of subject.grades) {
          for (const unit of grade.units) {
            expect(unit.achievementCodes.length, `${unit.unitId}`).toBeGreaterThan(0);
            for (const code of unit.achievementCodes) {
              expect(code).toMatch(ACHIEVEMENT_CODE_RE);
            }
          }
        }
      }
    }
  });

  it("모든 단원의 suggestedKinds 는 4 메커니즘 중에서만", () => {
    const allowed: CustomCardKind[] = [
      "multiple-choice",
      "blank",
      "typing",
      "word-match",
    ];
    const bands = listCatalog();
    for (const band of bands) {
      for (const subject of band.subjects) {
        for (const grade of subject.grades) {
          for (const unit of grade.units) {
            expect(unit.suggestedKinds.length).toBeGreaterThan(0);
            for (const k of unit.suggestedKinds) {
              expect(allowed).toContain(k);
            }
          }
        }
      }
    }
  });

  it("학년군별 코드 prefix — 초3-4=4, 초5-6=6, 중1-3=9", () => {
    const bands = listCatalog();
    function expectPrefix(gradeBand: string, grade: number, prefix: string) {
      const grades = bands
        .find((b) => b.gradeBand === gradeBand)
        ?.subjects.find((s) => s.subject === "english")
        ?.grades.find((g) => g.grade === grade);
      expect(grades).toBeDefined();
      for (const unit of grades!.units) {
        for (const code of unit.achievementCodes) {
          expect(code.startsWith(`[${prefix}영`)).toBe(true);
        }
      }
    }
    expectPrefix("elementary", 4, "4");
    expectPrefix("elementary", 5, "6");
    expectPrefix("elementary", 6, "6");
    expectPrefix("middle", 1, "9");
    expectPrefix("middle", 2, "9");
  });
});

describe("catalog-loader — findCatalogUnit / findCatalogGradeContext", () => {
  it("정상 path → 단원 반환", () => {
    const u = findCatalogUnit({
      gradeBand: "elementary",
      subject: "english",
      grade: 4,
      unitId: "greetings-introductions",
    });
    expect(u?.unitName).toBe("안녕! 만나서 반가워");
  });

  it("존재하지 않는 path → undefined", () => {
    const u = findCatalogUnit({
      gradeBand: "elementary",
      subject: "english",
      grade: 4,
      unitId: "no-such-unit",
    });
    expect(u).toBeUndefined();
  });

  it("grade context — 한국어 이름 매핑", () => {
    const ctx = findCatalogGradeContext({
      gradeBand: "middle",
      subject: "english",
      grade: 1,
    });
    expect(ctx).toEqual({
      gradeBandName: "중학교",
      subjectName: "영어",
      gradeName: "중학교 1학년",
    });
  });
});
