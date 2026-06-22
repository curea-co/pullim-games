// SSR / hydration 전 스켈레톤.
// 실제 콘텐츠와 layout 일치 — FOUC 회피.

export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {/* KPI 3-card */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-block border border-border-hairline bg-bg-block"
          />
        ))}
      </div>
      {/* 추천 카드 */}
      <div className="h-32 animate-pulse rounded-block border border-border-hairline bg-bg-block" />
      {/* 게임별 행 */}
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-block border border-border-hairline bg-bg-block"
          />
        ))}
      </div>
    </div>
  );
}
