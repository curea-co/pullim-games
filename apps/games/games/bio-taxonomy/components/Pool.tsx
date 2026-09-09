// 풀 영역 — drop zone (카드 풀 복귀용). ref 노출.
// 카드가 풀에 있을 때 = 미배치 상태. 모든 카드가 풀에서 빠져나가야 "정답 확인" 활성.

import { forwardRef, type ReactNode } from "react";

interface PoolProps {
  dragOver: boolean;
  canReturn: boolean;
  onReturn: () => void;
  hasItems: boolean;
  children: ReactNode;
}

export const Pool = forwardRef<HTMLDivElement, PoolProps>(function Pool(
  { dragOver, hasItems, children, canReturn, onReturn },
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
          ? "카드를 선택해 분류하거나 끌어 놓으세요."
          : "모든 카드를 배치했어요"}
      </p>
      <button type="button" disabled={!canReturn} onClick={onReturn}
        className="mt-2 min-h-[44px] rounded-button border border-border-hairline px-3 py-2 text-helper focus-visible:outline focus-visible:outline-2 focus-visible:outline-type-primary disabled:opacity-50">
        카드 풀로 되돌리기
      </button>
      <div className="mt-2 flex min-h-[2.5rem] flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
});
