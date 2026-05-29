// rate-limit 식별 키 해소.
// - IP 헤더(x-forwarded-for 등)가 있으면 IP 사용(가장 정밀).
// - IP 미확보(비-Vercel/self-host/`bun run start` 로컬 prod): 400 전면차단도, host 단독
//   버킷(사이트 전체가 한 버킷 → 전역 DoS)도 피한다. host + User-Agent 해시로 per-client
//   granularity 를 더해 분산한다(완전 식별은 아니나 절충). abuse 의 실질 방어는 CSRF/
//   same-origin 이고, 본 키는 brute-force 둔화 보조다.
import { createHash } from "node:crypto";
import { extractClientIp } from "@/lib/server/rate-limit";

export function resolveRateLimitKey(request: Request): string {
  const rawIp = extractClientIp(request.headers);
  if (rawIp) return `ip:${rawIp}`;
  let host = request.headers.get("host")?.trim() || "";
  if (!host) {
    try {
      host = new URL(request.url).host;
    } catch {
      host = "loopback";
    }
  }
  const uaHash = createHash("sha256")
    .update(request.headers.get("user-agent") ?? "")
    .digest("hex")
    .slice(0, 16);
  return `host:${host}|ua:${uaHash}`;
}
