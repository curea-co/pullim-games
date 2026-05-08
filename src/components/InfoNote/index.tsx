// 페이지 하단 정보 카드 — pullim-study-demo `FlywheelNote` 패턴 차용.
// 풀림 게임즈에선 단일 FSRS 백본 인사이트 (게임이 N개여도 같은 카드 풀에 쌓임) 등에 활용.

import type { ReactNode } from "react";

interface InfoNoteProps {
  /** 강조 라벨 (예: "학습 데이터", "오늘의 메모") */
  label: string;
  children: ReactNode;
}

export function InfoNote({ label, children }: InfoNoteProps) {
  return (
    <aside className="rounded-block border border-border-hairline bg-bg-block p-3.5 text-helper leading-relaxed text-type-secondary">
      <strong className="text-type-primary">{label}</strong>
      <span aria-hidden="true"> · </span>
      <span>{children}</span>
    </aside>
  );
}
