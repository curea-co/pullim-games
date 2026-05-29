// rate-limit 식별 키 해소 — billing 라우트의 round 6 fix 패턴 차용.
// production: IP 헤더 필수(없으면 빈 문자열 → 호출부 fail-closed).
// dev/test: `dev:<host>` 폴백으로 localhost 폼 동작 보장.
import { extractClientIp } from "@/lib/server/rate-limit";

export function resolveRateLimitKey(request: Request): string {
  const rawIp = extractClientIp(request.headers);
  if (rawIp) return rawIp;
  if (process.env.NODE_ENV === "production") return "";
  let host = request.headers.get("host")?.trim() || "";
  if (!host) {
    try {
      host = new URL(request.url).host;
    } catch {
      host = "loopback";
    }
  }
  return `dev:${host}`;
}
