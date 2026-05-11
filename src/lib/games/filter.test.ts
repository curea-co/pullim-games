import { describe, expect, it } from "vitest";
import { Variable } from "lucide-react";
import { applyFilter, deriveSubjectOptions, MECHANIC_OPTIONS } from "./filter";
import type { GameManifest } from "./types";

const dummy = (
  id: string,
  subject: string,
  mechanic: GameManifest["meta"]["mechanic"],
): GameManifest => ({
  meta: {
    id,
    title: id,
    subject,
    unit: "u",
    tagline: "t",
    estimatedMinutes: 1,
    status: "available",
    icon: Variable,
    mechanic,
    retrievalDepth: "deep",
  },
  loadComponent: () => Promise.resolve({ default: () => null }),
});

describe("applyFilter", () => {
  const games = [
    dummy("a", "수학", "manipulation"),
    dummy("b", "수학", "multiple-choice"),
    dummy("c", "영어", "sorting"),
  ];

  it("필터 없음 → 전체", () => {
    expect(applyFilter(games, {})).toHaveLength(3);
  });

  it("subject=math → 수학 게임만", () => {
    expect(applyFilter(games, { subject: "math" })).toHaveLength(2);
  });

  it("subject=english + mechanic=sorting → 1개", () => {
    const result = applyFilter(games, {
      subject: "english",
      mechanic: "sorting",
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.meta.id).toBe("c");
  });

  it("subject=all → 필터 무시", () => {
    expect(applyFilter(games, { subject: "all" })).toHaveLength(3);
  });
});

describe("deriveSubjectOptions", () => {
  it("게임 라인업에서 과목 옵션 도출 + '전체' 포함", () => {
    const games = [
      dummy("a", "수학", "manipulation"),
      dummy("b", "수학", "multiple-choice"),
      dummy("c", "영어", "sorting"),
    ];
    const opts = deriveSubjectOptions(games);
    expect(opts[0]).toEqual({ value: "all", label: "전체" });
    expect(opts.find((o) => o.value === "math")).toBeDefined();
    expect(opts.find((o) => o.value === "english")).toBeDefined();
    expect(opts).toHaveLength(3); // 전체 + 수학 + 영어
  });
});

describe("MECHANIC_OPTIONS", () => {
  it("5 메커닉 + 전체 = 6개", () => {
    expect(MECHANIC_OPTIONS).toHaveLength(6);
    expect(MECHANIC_OPTIONS[0]!.value).toBe("all");
  });
});
