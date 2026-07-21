"use client";

// 게임 허브 보조 진입 — "다른 모드로 풀기" chip row.
// Plan E Phase 5 (V0.4 옵션): URL 직접 진입 외 진입점을 화면에 노출.
// 캐주얼 톤 유지 (Plan E §0.C) — 단순 link chip, 디폴트 게임으로 진입.
//
// PR #92 Codex round 1 fix:
//   - defaultGameId 가 비지원이면 비-default 모드 chip 노출 차단 (실 동작 계약 정합).
//   - chip 디자인 SPEC 08.10/08.12 정합: rounded-button + px-4 py-2 (44×44 터치 영역).
//
// PR #92 Codex round 2 fix:
//   - chip 의 가로 너비도 44px 이상 보장 — min-w-[44px] 추가 (짧은 label 회귀 차단).
//
// PR #92 Codex round 6 fix:
//   - SPEC 08.10 focus ring (outline: 2px solid #0362DA; outline-offset: 2px) 정합:
//     focus-visible:outline-2 focus-visible:outline-accent-positive focus-visible:outline-offset-2
//     명시적으로 부여 — 키보드 Tab 진입 시 chip 포커스 표시 누락 방지.

import Link from "next/link";
import type { GameMode } from "@/lib/core";
import { isModeSupportedFor } from "@/lib/games/supported-modes";

interface Props {
  /**
   * 진입 시 default 게임 — 4 메커니즘 컴포넌트 기반 게임이어야 time-attack 타이머가 작동.
   * default = math-quick-quiz (QuickQuiz 메커니즘).
   * Plan E Phase 3 한정: time-attack 은 4 메커니즘만 통합 (12 직접 게임은 추후).
   * 비지원 게임이 들어오면 해당 mode chip 은 노출되지 않는다.
   */
  defaultGameId?: string;
}

const ALT_MODES: Array<{
  mode: Exclude<GameMode, "default">;
  label: string;
  hint: string;
}> = [
  { mode: "review-queue", label: "오늘 카드", hint: "due-soon 5장" },
  { mode: "time-attack", label: "타임어택", hint: "30초/카드" },
  { mode: "deep-recall", label: "잊혀가는 카드", hint: "R<0.6 만" },
];

export function ModeChipsRow({ defaultGameId = "math-quick-quiz" }: Props) {
  const supportedAlts = ALT_MODES.filter((alt) =>
    isModeSupportedFor(defaultGameId, alt.mode),
  );

  if (supportedAlts.length === 0) {
    // 비지원 게임 (e.g. factorization) 이 default 로 지정된 경우 — 진입점 자체 미노출.
    return null;
  }

  return (
    <nav
      aria-label="다른 모드로 풀기"
      data-testid="hub-mode-chips"
      className="puds-hub-surface flex flex-wrap items-center gap-2 px-3 py-2"
    >
      <span className="text-helper text-type-secondary">다른 모드로</span>
      {supportedAlts.map((alt) => (
        <Link
          key={alt.mode}
          href={`/games/${defaultGameId}?mode=${alt.mode}`}
          data-cta-priority="informational"
          data-mode={alt.mode}
          aria-label={`${alt.label} 모드로 진입 (${alt.hint})`}
          className="puds-chip inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-4 py-2 text-helper"
        >
          {alt.label}
          <span className="ml-1 text-type-secondary/60">· {alt.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
