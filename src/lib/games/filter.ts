// 게임 목록 필터링 유틸 — 메인페이지에서 query param 기반 필터 적용.
//
// Plan F §7.2 단계적 활성:
//   - 게임 수 < 6: 필터 비활성, 전체 노출
//   - 6-9: 과목 칩 활성
//   - 10+: 과목 + 메커닉 칩

import type { GameManifest } from "./types";

export const FILTER_THRESHOLD_SUBJECT = 6;
export const FILTER_THRESHOLD_MECHANIC = 10;

export interface FilterState {
  subject?: string; // 'math', 'english', etc., undefined = all
  mechanic?: string; // 'manipulation', etc.
}

export function applyFilter(
  games: GameManifest[],
  filter: FilterState,
): GameManifest[] {
  return games.filter((g) => {
    if (filter.subject && filter.subject !== "all") {
      // 과목 라벨이 가벼운 비교 — "수학" / "영어" / etc.
      if (!subjectMatch(g.meta.subject, filter.subject)) return false;
    }
    if (filter.mechanic && filter.mechanic !== "all") {
      if (g.meta.mechanic !== filter.mechanic) return false;
    }
    return true;
  });
}

const SUBJECT_KOREAN_TO_KEY: Record<string, string> = {
  수학: "math",
  영어: "english",
  국어: "korean",
  사회: "social",
  과학: "science",
};

function subjectMatch(gameSubject: string, filterValue: string): boolean {
  return SUBJECT_KOREAN_TO_KEY[gameSubject] === filterValue;
}

/** 게임 라인업에서 사용 가능한 과목 옵션 도출. */
export function deriveSubjectOptions(
  games: GameManifest[],
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [{ value: "all", label: "전체" }];
  for (const g of games) {
    const key = SUBJECT_KOREAN_TO_KEY[g.meta.subject];
    if (key && !seen.has(key)) {
      seen.add(key);
      options.push({ value: key, label: g.meta.subject });
    }
  }
  return options;
}

/** 메커닉 옵션 — Plan F §6 정의 5종. */
export const MECHANIC_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "manipulation", label: "조작" },
  { value: "sorting", label: "정렬" },
  { value: "matching", label: "매칭" },
  { value: "multiple-choice", label: "객관식" },
  { value: "typing", label: "타이핑" },
];
