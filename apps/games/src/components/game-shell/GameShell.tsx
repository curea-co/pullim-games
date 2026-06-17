// 게임 공통 wrapper — 14 게임의 main 레이아웃 통일.
// `proc/plan/2026-05-12_game-detail-single-column.md` 따름 — 1열 + CTA viewport-in.
//
// 핵심:
// - 부모(AppShell game mode) 의 정확한 100% 높이를 채우는 `h-full flex flex-col`.
// - 모든 viewport·variant 에서 세로 1열. variant 는 max-w 만 결정.
// - content section 이 자체 스크롤 (overflow-y-auto + min-h-0), CTA 는 항상 viewport 안.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GameShellVariant = "split" | "stack" | "match";

interface GameShellProps {
  /** 상단 영역 — 진행도 + 메뉴 등. */
  header: ReactNode;

  /** 게임 메커닉 본체 (블록·캔버스·문제·보기 등). 길어지면 내부 스크롤. */
  content: ReactNode;

  /** CTA 버튼 + 부가 정보. 항상 viewport 안에 anchor. */
  cta: ReactNode;

  /**
   * 레이아웃 변형 — max-w 만 차이. 1열 정책은 모두 동일.
   * - "split" : lg+ 640. 다수 게임 기본.
   * - "stack" : 480. 세로 드래그 메커닉 (factorization).
   * - "match" : lg+ 720. 매칭 메커닉 (english-word-match).
   */
  variant?: GameShellVariant;

  /** 접근성용 sr-only live region. */
  liveRegion?: ReactNode;
}

export function GameShell({
  header,
  content,
  cta,
  variant = "split",
  liveRegion,
}: GameShellProps) {
  const maxW =
    variant === "match"
      ? "max-w-[480px] lg:max-w-[720px]"
      : variant === "stack"
        ? "max-w-[480px]"
        : "max-w-[480px] lg:max-w-[640px]";

  return (
    <main
      data-testid="game-shell"
      data-variant={variant}
      className={cn(
        "mx-auto flex h-full w-full flex-col px-6 py-6",
        maxW,
      )}
    >
      {header}
      <section
        data-testid="game-shell-content"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {content}
      </section>
      <footer data-testid="game-shell-cta" className="mt-6">
        {cta}
      </footer>
      {liveRegion}
    </main>
  );
}
