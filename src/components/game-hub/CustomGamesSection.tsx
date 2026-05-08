// 나만의 게임 영역 — `2026-05-08_game-hub.md` §7.
// V0.5 본격 구현 (management plan) 전까지는 placeholder.
// 게임 허브 하단 별도 섹션, 일반 게임보다 좁은 시각 위계.

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function CustomGamesSection() {
  // 현재는 항상 빈 상태 (custom card 0). management plan M5 와 합류 시 실제 데이터 연결.
  return (
    <section
      aria-label="나만의 게임"
      className="flex flex-col gap-3 rounded-block border border-dashed border-border-hairline bg-bg-block p-4"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-600"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-label font-bold text-type-primary">
              나만의 게임
            </h2>
            <p className="text-helper text-type-secondary">
              내가 만든 카드로 풀어볼 수 있어요
            </p>
          </div>
        </div>
      </header>

      <p className="text-helper text-type-secondary">
        아직 만든 카드가 없어요. 관리에서 첫 카드를 만들어 보세요.
      </p>

      <Link
        href="/manage"
        className="group inline-flex items-center justify-center gap-1.5 rounded-button border border-border-hairline bg-bg-primary px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
      >
        관리에서 만들기
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
