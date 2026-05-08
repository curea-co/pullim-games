"use client";

// /manage/custom-games — 나만의 게임 (메커닉별 카드 + 풀기 CTA).

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { loadCounts, type CustomCounts, type CustomCardKind } from "@/lib/core";
import { games } from "@/lib/games/registry";

const KIND_TO_GAME_ID: Record<CustomCardKind, string> = {
  "multiple-choice": "custom-multiple-choice",
  blank: "custom-blank",
  typing: "custom-typing",
  "word-match": "custom-word-match",
};

const KIND_LABEL: Record<CustomCardKind, string> = {
  "multiple-choice": "객관식",
  blank: "빈칸",
  typing: "타이핑",
  "word-match": "매칭",
};

export default function CustomGamesPage() {
  const [counts, setCounts] = useState<CustomCounts | null>(null);

  useEffect(() => {
    setCounts(loadCounts());
  }, []);

  if (!counts) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-block border border-border-hairline bg-bg-block"
          />
        ))}
      </div>
    );
  }

  if (counts.cards === 0) {
    return (
      <div className="rounded-block border border-dashed border-border-hairline bg-bg-block p-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-button bg-accent-positive/10 text-accent-positive"
        >
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="mt-3 text-base font-bold text-type-primary">
          만든 카드가 없어요
        </h2>
        <p className="mt-2 text-helper text-type-secondary">
          관리 → 콘텐츠에서 첫 카드를 만들어 보세요.
        </p>
        <Link
          href="/manage/content"
          className="mt-4 inline-flex items-center gap-1.5 rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
        >
          카드 만들기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const kinds = Object.keys(counts.cardsByKind) as CustomCardKind[];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-helper text-type-secondary">
        총 {counts.cards}장 — 메커닉별로 골라 풀어보세요
      </p>
      {kinds.map((kind) => {
        const cardCount = counts.cardsByKind[kind];
        const gameId = KIND_TO_GAME_ID[kind];
        const game = games.find((g) => g.meta.id === gameId);
        if (!game) return null;
        const Icon = game.meta.icon;
        const isPlayable = cardCount > 0;
        return (
          <div
            key={kind}
            className="flex items-center gap-3 rounded-block border border-border-hairline bg-bg-block px-4 py-3"
          >
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-button ${
                isPlayable
                  ? "bg-accent-positive/10 text-accent-positive"
                  : "bg-pullim-slate-100 text-pullim-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-label font-bold text-type-primary">
                {KIND_LABEL[kind]}
              </p>
              <p className="text-helper tabular text-type-secondary">
                {cardCount}장 카드
              </p>
            </div>
            {isPlayable ? (
              <Link
                href={`/games/${gameId}`}
                className="inline-flex items-center gap-1 rounded-button border border-type-primary bg-bg-block px-3 py-1.5 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
              >
                풀기 <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-helper text-type-secondary">
                카드 없음
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
