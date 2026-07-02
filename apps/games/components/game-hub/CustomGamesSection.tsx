"use client";

// 나만의 게임 영역. shadcn Card.
// 빈 상태: 영역 전체가 Link CTA — 큰 + 아이콘 + "첫 카드 만들기" 강조.
// 채워진 상태: 메커닉 그리드 + 하단 full-width "+ 카드 더 만들기" 버튼.
// plan: proc/archive/plan/2026-05-13_custom-games-cta.md (D1=A).

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, PlusCircle, Sparkles } from "lucide-react";
import { games } from "@/lib/games/registry";
import {
  loadCounts,
  type CustomCounts,
  type CustomCardKind,
} from "@/lib/core";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KIND_BY_GAME_ID: Record<string, CustomCardKind> = {
  "custom-multiple-choice": "multiple-choice",
  "custom-blank": "blank",
  "custom-typing": "typing",
  "custom-word-match": "word-match",
};

export function CustomGamesSection() {
  const [counts, setCounts] = useState<CustomCounts | null>(null);

  useEffect(() => {
    setCounts(loadCounts());
  }, []);

  const customGames = games.filter((g) => g.meta.kind === "custom");
  const totalCustomCards = counts ? counts.cards : 0;

  // 빈 상태 — 영역 전체가 거대 CTA
  if (totalCustomCards === 0) {
    return (
      <Link
        href="/manage/content"
        aria-label="첫 카드 만들기"
        data-cta-priority="informational"
        className="block rounded-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-type-primary focus-visible:ring-offset-2"
      >
        <Card
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-block border-dashed border-border-hairline bg-bg-block px-4 py-8 shadow-none transition-colors",
            "hover:border-type-primary/50 hover:bg-bg-shell/40 active:scale-[0.99] active:bg-bg-shell",
          )}
        >
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-button bg-pullim-slate-100 text-pullim-slate-600"
          >
            <PlusCircle className="h-7 w-7" strokeWidth={1.8} />
          </span>
          <h2 className="text-label font-bold text-type-primary">
            첫 카드 만들기
          </h2>
          <p className="text-helper text-type-secondary">
            내가 만든 카드로 풀어볼 수 있어요
          </p>
        </Card>
      </Link>
    );
  }

  // 채워진 상태 — 그리드 + 하단 full-width "카드 더 만들기" 버튼
  return (
    <Card
      aria-label="나만의 게임"
      className="flex flex-col gap-3 rounded-block border-dashed border-border-hairline bg-bg-block p-4 shadow-none"
    >
      <header className="flex items-center gap-2">
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
            총 {totalCustomCards}장 — 메커닉별로 골라 풀어보세요
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-2">
        {customGames.map((g) => {
          const Icon = g.meta.icon;
          const kind = KIND_BY_GAME_ID[g.meta.id];
          const cardCount = kind && counts ? counts.cardsByKind[kind] : 0;
          const isPlayable = cardCount > 0;
          return (
            <li key={g.meta.id}>
              <Link href={`/games/${g.meta.id}`} data-cta-priority="informational" className="group block">
                <Card
                  className={cn(
                    "flex items-center gap-2 rounded-block bg-bg-primary px-3 py-2.5 shadow-none transition-colors",
                    isPlayable
                      ? "border-border-hairline group-hover:border-type-primary/30"
                      : "border-border-hairline opacity-65",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-button",
                      isPlayable
                        ? "bg-accent-positive/10 text-accent-positive"
                        : "bg-pullim-slate-100 text-pullim-slate-500",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-helper font-bold text-type-primary">
                      {g.meta.title}
                    </p>
                    <p className="text-[10px] tabular text-type-secondary">
                      {cardCount}장 카드
                    </p>
                  </div>
                  <ArrowRight
                    className="h-3 w-3 shrink-0 text-type-secondary/40"
                    aria-hidden="true"
                  />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/manage/content"
        aria-label="카드 더 만들기"
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-button border border-dashed border-border-hairline bg-bg-block px-4 py-2.5 text-helper text-type-secondary transition-colors",
          "hover:border-type-primary/40 hover:text-type-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-type-primary focus-visible:ring-offset-2",
        )}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        카드 더 만들기
      </Link>
    </Card>
  );
}
