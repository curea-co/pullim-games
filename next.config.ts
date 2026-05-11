import type { NextConfig } from "next";

// dev (HMR) 와 build (prod artifacts) 가 .next/ 를 공유하면 충돌 발생.
// (build 가 dev 청크를 덮어써 dev server 가 MODULE_NOT_FOUND 에러)
//   → NODE_ENV 기반으로 distDir 분리.
//
// next dev   → NODE_ENV=development → .next-dev/
// next build → NODE_ENV=production  → .next/
// next start → NODE_ENV=production  → .next/  (build 결과 그대로 읽음)
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: isDev ? ".next-dev" : ".next",
  // V1: 모바일 웹 단일 도메인. 추가 도메인/리다이렉트는 V2 풀림 SSO 통합 시점.
  // dev 인디케이터(좌하단 N + Issue 토스트) — 학습 콘텐츠 위 노출 회피.
  // 빌드 상태는 터미널/네트워크 패널에서 확인 (prod 영향 없음).
  devIndicators: false,
};

export default nextConfig;
