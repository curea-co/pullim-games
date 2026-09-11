// 로그인 복귀 주소는 배포 설정과 명시된 games origin만 허용한다.
import { headers } from "next/headers";
import { getSiteUrl } from "./site-url";

export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const canonical = getSiteUrl();
  const localOrigins = ["http://localhost:3004", "http://games.pullim.local:3004"];
  const allowed = new Set([
    canonical, "https://games.pullim.ai", "https://dev-games.pullim.ai",
    ...(!process.env.VERCEL ? localOrigins : []),
  ]);
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) allowed.add(`https://${host}`);
  }
  const host = h.get("host");
  if (!host) return canonical;
  const proto = h.get("x-forwarded-proto") ?? (localOrigins.includes(`http://${host}`) ? "http" : "https");
  const origin = `${proto}://${host}`;
  return allowed.has(origin) ? origin : canonical;
}
