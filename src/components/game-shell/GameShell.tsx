// 게임 공통 wrapper — 14 게임의 main 레이아웃 통일.
// `proc/plan/2026-05-11_game-cta-layout.md` §3 따름.
// `proc/plan/2026-05-11_layout-overhaul.md` F3=B — aside prop 미지정이면 split 도 lg+ 단일 컬럼.
// `proc/plan/2026-05-11_game-shell-right-area.md` — aside slot (chemistry-balance pilot).
//
// 핵심:
// - 부모(AppShell 본문 스크롤 영역) 의 100% 높이를 채우도록 `min-h-full`.
// - 모바일은 세로 stack (header / content / cta), 와이드 (lg+) 는 variant 에 따라 좌우 분할.
// - variant 별 메커닉 적합도는 plan §3.2 표 참조.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GameShellVariant = "split" | "stack" | "match";

interface GameShellProps {
  /** 상단(모바일) 또는 우측 상단(lg+ split). 진행도 + 메뉴 등. */
  header: ReactNode;

  /** 게임 메커닉 본체 (블록·캔버스·문제·보기 등). */
  content: ReactNode;

  /** CTA 버튼 + 부가 정보. 모바일은 하단, lg+ split 은 우측 하단. */
  cta: ReactNode;

  /**
   * lg+ split 시 우측 영역의 header 와 cta 사이에 렌더되는 보조 콘텐츠.
   * 가이드 텍스트 / 힌트 버튼 / 풀이 단계 시각화 등 게임마다 자유.
   *
   * 동작:
   * - split variant + lg+ : 우측 가운데 슬롯 (flex-1 로 남는 공간 차지)
   * - split variant + 모바일(~md) : 미노출 (모바일은 메뉴 ≡ 또는 content 안에서 별도로)
   * - 미지정 시 : split 도 lg+ 에서 단일 컬럼 폴백 (빈 우측 컬럼 회피)
   * - stack / match variant : 무시 (좌우 분할 자체가 없음)
   *
   * 권장 패턴 (`plan §3.3` 참조):
   *   aside={<p className="text-helper text-type-secondary">계수를 조정해 양변 원자 수를 맞춰주세요</p>}
   */
  aside?: ReactNode;

  /**
   * 레이아웃 변형:
   * - "split" : 모바일 세로 stack / lg+ 좌우 분할 (다수 게임 기본).
   *   ↳ aside prop 미지정이면 lg+ 에서도 단일 컬럼 (빈 우측 컬럼 회피).
   * - "stack" : 항상 세로. 세로 드래그 메커닉 (factorization) 보존.
   * - "match" : 항상 세로. 매칭 메커닉이 이미 좌우라 lg+ 폭만 키움.
   */
  variant?: GameShellVariant;

  /** split 레이아웃 좌:우 비율 (CSS grid-template-columns). 기본 "3fr 2fr". */
  splitRatio?: string;

  /** 접근성용 sr-only live region. */
  liveRegion?: ReactNode;
}

export function GameShell({
  header,
  content,
  cta,
  aside,
  variant = "split",
  splitRatio = "3fr 2fr",
  liveRegion,
}: GameShellProps) {
  if (variant === "split" && aside) {
    return (
      <main
        className={cn(
          // 모바일 (~md): 세로 stack — 기존 패턴 유지
          "mx-auto flex min-h-full w-full max-w-[480px] flex-col px-6 py-6",
          // lg+: 좌우 분할 (aside 콘텐츠가 있을 때만)
          "lg:grid lg:max-w-[960px] lg:grid-cols-[var(--split)] lg:gap-8 lg:px-8",
        )}
        style={{ ["--split" as never]: splitRatio }}
      >
        {/* 모바일: header → content → cta (DOM order) */}
        {/* lg+: content 좌(order-1), header+aside+cta 우(order-2) */}
        <div className="contents lg:hidden">{header}</div>
        <section className="flex flex-1 flex-col lg:order-1 lg:min-h-full">
          {content}
        </section>
        <aside className="mt-6 flex flex-col gap-6 lg:order-2 lg:mt-0 lg:justify-between">
          <div className="hidden lg:block">{header}</div>
          <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:gap-3">
            {aside}
          </div>
          <div>{cta}</div>
        </aside>
        {liveRegion}
      </main>
    );
  }

  // 단일 컬럼 — stack/match, 또는 split + aside 미지정 폴백
  const maxW =
    variant === "match"
      ? "max-w-[480px] lg:max-w-[720px]"
      : variant === "split"
        ? "max-w-[480px] lg:max-w-[640px]"
        : "max-w-[480px]";

  return (
    <main
      className={cn(
        "mx-auto flex min-h-full w-full flex-col px-6 py-6",
        maxW,
      )}
    >
      {header}
      <section className="flex flex-1 flex-col">{content}</section>
      <footer className="mt-6">{cta}</footer>
      {liveRegion}
    </main>
  );
}
