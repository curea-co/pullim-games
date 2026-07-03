// /manage/* 공통 layout — ManageNav 탭 + 본문.

import type { ReactNode } from "react";
import { ManageNav } from "@/components/manage/ManageNav";

export default function ManageLayout({ children }: { children: ReactNode }) {
  // OsShell 콘텐츠 래퍼가 div 로 바뀌어(중첩 main 회피, codex #138 R5) /manage 는 여기서 main
  // 랜드마크를 제공한다 — 페이지당 정확히 하나의 main 보장.
  return (
    <main className="flex flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-type-secondary">
          관리
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-type-primary">
          내 학습 콘텐츠 만들기
        </h1>
        <p className="mt-1.5 text-label text-type-secondary">
          과목·교육과정·카드를 만들어 나만의 게임을 풀어보세요
        </p>
      </header>
      <ManageNav />
      <div className="mt-2">{children}</div>
    </main>
  );
}
