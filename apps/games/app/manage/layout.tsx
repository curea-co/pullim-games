// /manage/* 공통 layout — ManageNav 탭 + 본문.

import type { ReactNode } from "react";
import { ManageNav } from "@/components/manage/ManageNav";

export default function ManageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
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
    </div>
  );
}
