// rate-limit 식별 키 해소.
// IP 헤더(x-forwarded-for 등)가 있으면 IP 사용. 없으면 host 기반 fallback —
// production 이라도 400(client_unidentified)으로 전면 차단하지 않는다(비-Vercel/self-host/
// `bun run start` 로컬 prod 에서 정상 로그인·회원가입이 막히던 회귀 방지). rate-limit 정밀도는
// 떨어지지만(같은 host 공유) abuse 의 실질 방어는 CSRF/same-origin 이며, 식별불가 전면차단보다
// 가용성을 우선한다.
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
  return `host:${host}`;
}
