"use client";

// 나만의 게임 영역 — `2026-05-08_game-hub.md` §7.
// kind='custom' 게임 목록 + 카드 수 표시. 빈 카드면 disabled-like 안내.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { games } from "@/lib/games/registry";
import { loadCounts, type CustomCounts, type CustomCardKind } from "@/lib/core";

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
        <Link
          href="/manage/content"
          className="text-helper text-type-secondary hover:text-type-primary"
        >
          + 카드 만들기
        </Link>
      </header>

      {totalCustomCards === 0 ? (
        <p className="text-helper text-type-secondary">
          아직 만든 카드가 없어요.{" "}
          <Link
            href="/manage"
            className="font-medium text-type-primary hover:text-accent-positive"
          >
            관리
          </Link>{" "}
          에서 첫 카드를 만들어 보세요.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {customGames.map((g) => {
            const Icon = g.meta.icon;
            const kind = KIND_BY_GAME_ID[g.meta.id];
            const cardCount = kind && counts ? counts.cardsByKind[kind] : 0;
            const isPlayable = cardCount > 0;
            return (
              <li key={g.meta.id}>
                <Link
                  href={`/games/${g.meta.id}`}
                  className={`group flex items-center gap-2 rounded-block border bg-bg-primary px-3 py-2.5 transition-colors ${
                    isPlayable
                      ? "border-border-hairline hover:border-type-primary/30"
                      : "border-border-hairline opacity-65"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-button ${
                      isPlayable
                        ? "bg-accent-positive/10 text-accent-positive"
                        : "bg-pullim-slate-100 text-pullim-slate-500"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
