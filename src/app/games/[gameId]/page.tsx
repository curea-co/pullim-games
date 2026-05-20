// /games/[gameId] — 동적 라우팅. registry에서 gameId로 게임 조회.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAllGameIds, getGameById } from "@/lib/games/registry";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// 정적 생성 — registry의 모든 게임 사전 렌더.
export function generateStaticParams() {
  return getAllGameIds().map((gameId) => ({ gameId }));
}

// 게임별 메타데이터 (제목, OG 등).
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gameId } = await params;
  const game = getGameById(gameId);
  if (!game) {
    return { title: "게임을 찾을 수 없어요 · 풀림 게임즈" };
  }
  return {
    title: `${game.meta.title} · 풀림 게임즈`,
    description: game.meta.tagline,
    openGraph: {
      title: game.meta.title,
      description: game.meta.tagline,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function GamePage({ params }: PageProps) {
  const { gameId } = await params;
  const game = getGameById(gameId);

  if (!game || game.meta.status !== "available") {
    notFound();
  }

  // 동적 import — Next.js 가 게임별 청크 분할.
  const { default: Game } = await game.loadComponent();
  // Suspense — useSearchParams 사용 게임 컴포넌트의 prerender CSR bailout 처리 (Plan E Phase 2).
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-helper text-type-secondary">
          불러오는 중…
        </div>
      }
    >
      <Game />
    </Suspense>
  );
}
