// 게임 카드 과목 뱃지 — 시각 카테고리화.
// `proc/plan/2026-05-12_game-discrimination-and-polish.md` I8.
//
// 정적 매핑 — tailwind JIT purge 가 dynamic className 잡지 못해 명시적 클래스만 사용.

const SUBJECT_BADGE: Record<string, string> = {
  국어: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
  영어: "bg-pullim-blue-100 text-pullim-blue-700 ring-1 ring-pullim-blue-300",
  수학: "bg-violet-100 text-violet-700 ring-1 ring-violet-300",
  과학: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-300",
  사회: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  "내 콘텐츠": "bg-pullim-slate-200 text-pullim-slate-700 ring-1 ring-pullim-slate-300",
};

export function subjectBadgeClass(subject: string): string {
  return SUBJECT_BADGE[subject] ?? SUBJECT_BADGE["내 콘텐츠"];
}
