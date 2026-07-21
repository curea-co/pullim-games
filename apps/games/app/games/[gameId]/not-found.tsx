// 미등록 gameId 또는 'coming-soon' 게임 진입 시.

import Link from "next/link";

export default function GameNotFound() {
  return (
    <main
      data-puds-state="empty"
      className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center gap-6 px-6 py-10 text-center"
    >
      <h1 className="text-display">아직 만나지 못한 게임이에요</h1>
      <p className="text-body text-type-secondary">
        다른 게임이 메인페이지에서 기다리고 있어요.
      </p>
      <Link
        href="/home"
        className="rounded-button border border-border-hairline px-4 py-2 text-body text-type-primary hover:bg-bg-block"
      >
        메인으로 돌아가기
      </Link>
    </main>
  );
}
