// /manage/custom-games — 나만의 게임 (placeholder, M5 가 본격 구현).

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CustomGamesPage() {
  return (
    <div className="rounded-block border border-dashed border-border-hairline bg-bg-block p-8 text-center">
      <h2 className="text-base font-bold text-type-primary">내 게임 준비 중</h2>
      <p className="mt-2 text-helper text-type-secondary">
        만든 카드로 본 게임 메커닉 위에서 직접 풀어볼 수 있어요. 곧 열려요.
      </p>
      <Link
        href="/manage/content"
        className="mt-4 inline-flex items-center gap-1.5 rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
      >
        카드 만들러 가기
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
