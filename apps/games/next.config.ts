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
  // DB 를 쓰는 API 가 런타임에 migrations/*.sql 을 fs 로 읽어 자동 마이그레이션한다.
  // Next.js 는 import 하지 않은 파일을 서버리스 함수 번들에 자동 포함하지 않으므로,
  // Vercel 배포 시 첫 연결 마이그레이션이 동작하도록 명시 포함한다.
  // /api/sync/** 도 동일(학습 데이터 동기화·cleanup) — 누락 시 cold start 500.
  // 근거: proc/plan/2026-05-29_auth-login-signup.md · 2026-06-05_learning-data-server-sync.md.
  outputFileTracingIncludes: {
    "/api/auth/**": ["./migrations/**"],
    "/api/sync/**": ["./migrations/**"],
  },
};

export default nextConfig;
