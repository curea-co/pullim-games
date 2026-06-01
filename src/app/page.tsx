// / — 랜딩 히어로 (2026-06-01 도입). 기존 홈 대시보드는 /home 으로 이전.
// plan: proc/plan/2026-06-01_landing-page.md. 신규 방문자 진입 플로우 제공,
// 로그인/게스트 기록 보유자는 LandingHero 내부에서 /home 자동 리다이렉트.

import { LandingHero } from "./_landing/LandingHero";

export default function RootPage() {
  return <LandingHero />;
}
