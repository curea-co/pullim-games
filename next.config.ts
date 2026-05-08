import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // V1: 모바일 웹 단일 도메인. 추가 도메인/리다이렉트는 V2 풀림 SSO 통합 시점.
};

export default nextConfig;
