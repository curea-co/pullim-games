// rate-limit 식별 키 해소.
//
// KNOWN-TRADE-OFF (proc/plan/2026-05-29_auth-login-signup.md §3 D-RL — billing/notify 와
// 동일 한계): x-forwarded-for/x-real-ip 는 신뢰 프록시(Vercel 등)가 덮어쓰는 배포를 전제로
// 한다. Vercel 은 엣지에서 이 값을 실제 client IP 로 설정하므로 위조 불가. 그러나 신뢰
// 프록시가 없는 self-host 직노출 배포에서는 헤더 위조로 본 키를 우회할 수 있다. 이 인메모리·
// 헤더 기반 rate-limit 은 brute-force 둔화의 **보조 방어**이며, 위조 내성 있는 분산 rate-limit
// (KV + trusted-proxy 화이트리스트)은 후속 phase. brute-force 의 1차 방어는 bcrypt cost 12 +
// CSRF/same-origin 이다.
//
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
