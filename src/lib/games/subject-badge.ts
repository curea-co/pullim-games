// 게임 카드 과목 뱃지 — 시각 카테고리화.
// `proc/plan/2026-05-12_game-discrimination-and-polish.md` I8.
//
// 정적 매핑 — tailwind JIT purge 가 dynamic className 잡지 못해 명시적 클래스만 사용.

const SUBJECT_BADGE: Record<string, string> = {
  국어: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  영어: "bg-pullim-blue-50 text-pullim-blue-700 ring-1 ring-pullim-blue-200",
  수학: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  과학: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/60",
  사회: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  "내 콘텐츠": "bg-pullim-slate-100 text-pullim-slate-700 ring-1 ring-pullim-slate-200",
};

export function subjectBadgeClass(subject: string): string {
  return SUBJECT_BADGE[subject] ?? SUBJECT_BADGE["내 콘텐츠"];
}
