// 풀 영역 — drop zone (카드 풀 복귀용). ref 노출.
// 카드가 풀에 있을 때 = 미배치 상태. 모든 카드가 풀에서 빠져나가야 "정답 확인" 활성.

import { forwardRef, type ReactNode } from "react";

interface PoolProps {
  dragOver: boolean;
  hasItems: boolean;
  children: ReactNode;
}

export const Pool = forwardRef<HTMLDivElement, PoolProps>(function Pool(
  { dragOver, hasItems, children },
  ref,
) {
  return (
    <div
      ref={ref}
      data-pool="true"
      aria-label="카드 풀 — 미배치 카드"
      className={`rounded-block border-2 border-dashed bg-bg-block p-3 transition-all ${
        dragOver
          ? "border-type-primary ring-2 ring-offset-1 ring-type-primary"
          : "border-border-hairline"
      }`}
    >
      <p className="text-helper text-type-secondary">
        {hasItems
          ? "카드를 끌어 위 카테고리에 넣어주세요 (되돌릴 땐 여기로 끌어요)"
          : "모든 카드를 배치했어요"}
      </p>
      <div className="mt-2 flex min-h-[2.5rem] flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
});
