// 섹션 제목 + 설명 + (선택) 액션. 메인페이지의 게임 그룹별 헤딩에 사용.
// 레이아웃 패턴: pullim-study-demo `SectionHeading` 차용, 색은 우리 SPEC §08 토큰으로.

import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function SectionHeading({
  title,
  description,
  action,
}: SectionHeadingProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold leading-tight tracking-tight text-type-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-helper text-type-secondary">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
