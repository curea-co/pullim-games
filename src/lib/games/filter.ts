// 게임 목록 필터링 유틸 — `2026-05-08_game-hub.md` §5 따름 (6축 확장).
//
// 임계 정책 (Plan F §7.2 — 메인페이지 단계적 활성):
//   - 게임 수 < 6: 필터 비활성, 전체 노출
//   - 6-9: 과목 칩 활성
//   - 10+: 과목 + 메커닉 칩
// 게임 허브 (/games) 는 임계 무시 — 6축 전부 노출 (사용자 명시: 촘촘하게).

import type { GameManifest, GameMechanic, RetrievalDepth } from "./types";

export const FILTER_THRESHOLD_SUBJECT = 6;
export const FILTER_THRESHOLD_MECHANIC = 10;

export type SessionTimeBucket = "short" | "medium" | "long";
export type ProgressBucket = "untouched" | "in-progress" | "completed";

export interface FilterState {
  subject?: string; // 'math', 'english', etc., undefined/'all' = 전체
  mechanic?: GameMechanic | "all";
  depth?: RetrievalDepth | "all";
  /** ≤1분 / ≤3분 / 그 이상 */
  time?: SessionTimeBucket | "all";
  /** 진행도 — perGame stat 기반 */
  progress?: ProgressBucket | "all";
  /** 검색 텍스트 (제목·단원·태그라인 부분일치, case-insensitive) */
  search?: string;
}

/** 게임 진행도 분류 — perGame stat 의 cardsTouched / cardsTotal 기반. */
export interface ProgressLookup {
  /** gameId → progress bucket. 항목 없으면 'untouched'. */
  byGameId: Map<string, ProgressBucket>;
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

function timeBucket(estimatedMinutes: number): SessionTimeBucket {
  if (estimatedMinutes <= 1) return "short";
  if (estimatedMinutes <= 3) return "medium";
  return "long";
}

function searchMatch(g: GameManifest, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const haystacks = [g.meta.title, g.meta.unit, g.meta.tagline, g.meta.subject];
  return haystacks.some((h) => h.toLowerCase().includes(t));
}

export function applyFilter(
  games: GameManifest[],
  filter: FilterState,
  progress?: ProgressLookup,
): GameManifest[] {
  return games.filter((g) => {
    if (filter.subject && filter.subject !== "all") {
      if (!subjectMatch(g.meta.subject, filter.subject)) return false;
    }
    if (filter.mechanic && filter.mechanic !== "all") {
      if (g.meta.mechanic !== filter.mechanic) return false;
    }
    if (filter.depth && filter.depth !== "all") {
      if (g.meta.retrievalDepth !== filter.depth) return false;
    }
    if (filter.time && filter.time !== "all") {
      if (timeBucket(g.meta.estimatedMinutes) !== filter.time) return false;
    }
    if (filter.progress && filter.progress !== "all" && progress) {
      const p = progress.byGameId.get(g.meta.id) ?? "untouched";
      if (p !== filter.progress) return false;
    }
    if (filter.search) {
      if (!searchMatch(g, filter.search)) return false;
    }
    return true;
  });
}

/** 사용 가능한 과목 옵션 도출. */
export function deriveSubjectOptions(
  games: GameManifest[],
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [
    { value: "all", label: "전체" },
  ];
  for (const g of games) {
    const key = SUBJECT_KOREAN_TO_KEY[g.meta.subject];
    if (key && !seen.has(key)) {
      seen.add(key);
      options.push({ value: key, label: g.meta.subject });
    }
  }
  return options;
}

export const MECHANIC_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "manipulation", label: "조작" },
  { value: "sorting", label: "정렬" },
  { value: "matching", label: "매칭" },
  { value: "multiple-choice", label: "객관식" },
  { value: "typing", label: "타이핑" },
];

export const DEPTH_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "shallow", label: "얕음" },
  { value: "medium", label: "중간" },
  { value: "deep", label: "깊음" },
];

export const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "short", label: "≤ 1분" },
  { value: "medium", label: "≤ 3분" },
  { value: "long", label: "그 이상" },
];

export const PROGRESS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "untouched", label: "시작 안 함" },
  { value: "in-progress", label: "진행 중" },
  { value: "completed", label: "모두 풀이" },
];

/** PerGameStat[] → ProgressLookup. */
export function buildProgressLookup(
  perGame: { gameId: string; cardsTouched: number; cardsTotal: number }[],
): ProgressLookup {
  const byGameId = new Map<string, ProgressBucket>();
  for (const p of perGame) {
    if (p.cardsTouched === 0) byGameId.set(p.gameId, "untouched");
    else if (p.cardsTotal > 0 && p.cardsTouched >= p.cardsTotal)
      byGameId.set(p.gameId, "completed");
    else byGameId.set(p.gameId, "in-progress");
  }
  return { byGameId };
}
