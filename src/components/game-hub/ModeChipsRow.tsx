"use client";

// 게임 허브 보조 진입 — "다른 모드로 풀기" chip row.
// Plan E Phase 5 (V0.4 옵션): URL 직접 진입 외 진입점을 화면에 노출.
// 캐주얼 톤 유지 (Plan E §0.C) — 단순 link chip, 디폴트 게임으로 진입.

import Link from "next/link";

interface Props {
  /**
   * 진입 시 default 게임 — 4 메커니즘 컴포넌트 기반 게임이어야 time-attack 타이머가 작동.
   * default = math-quick-quiz (QuickQuiz 메커니즘).
   * Plan E Phase 3 한정: time-attack 은 4 메커니즘만 통합 (12 직접 게임은 추후).
   */
  defaultGameId?: string;
}

const ALT_MODES: Array<{
  mode: "review-queue" | "time-attack" | "deep-recall";
  label: string;
  hint: string;
}> = [
  { mode: "review-queue", label: "오늘 카드", hint: "due-soon 5장" },
  { mode: "time-attack", label: "타임어택", hint: "30초/카드" },
  { mode: "deep-recall", label: "잊혀가는 카드", hint: "R<0.6 만" },
];

export function ModeChipsRow({ defaultGameId = "math-quick-quiz" }: Props) {
  return (
    <nav
      aria-label="다른 모드로 풀기"
      data-testid="hub-mode-chips"
      className="flex flex-wrap items-center gap-2 rounded-block border border-border-hairline bg-bg-block px-3 py-2"
    >
      <span className="text-helper text-type-secondary">다른 모드로</span>
      {ALT_MODES.map((alt) => (
        <Link
          key={alt.mode}
          href={`/games/${defaultGameId}?mode=${alt.mode}`}
          data-cta-priority="informational"
          aria-label={`${alt.label} 모드로 진입 (${alt.hint})`}
          className="rounded-full border border-border-hairline bg-bg-primary px-3 py-1 text-helper text-type-secondary hover:border-type-primary hover:text-type-primary"
        >
          {alt.label}
          <span className="ml-1 text-type-secondary/60">· {alt.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
