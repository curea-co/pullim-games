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
            className="puds-hub-surface h-24 animate-pulse"
          />
        ))}
      </div>
      {/* 추천 카드 */}
      <div className="puds-hub-surface h-32 animate-pulse" />
      {/* 게임별 행 */}
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="puds-hub-surface h-20 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
