// 서버(요청 처리) 시점의 **실제 요청 origin** — pullim 모드 인증 redirect 의 next 로 쓴다.
// canonical env(`getSiteUrl`)와 달리 로컬 SSO(`games.pullim.local:3004`)·preview alias 등
// 비정규 origin 에서도 사용자가 실제 접속한 호스트를 보존한다(Codex #141).
// 서버 전용 — `next/headers` 는 서버 컴포넌트·라우트에서만.
import { headers } from "next/headers";

/** 실제 요청 origin(`{proto}://{host}`). 헤더 부재 시 "". Vercel 프록시의 x-forwarded-proto 존중. */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") || host.endsWith(".local") ? "http" : "https");
  return `${proto}://${host}`;
}
