// pullim 모드 서버측 신원 확인 — 요청의 `*-pullim-at` 쿠키를 pullim-api `GET /games/me` 로
// introspection 해 회원 `sub` 를 얻는다. mutation 라우트(grade 저장 등)는 클라가 준 sub 를
// 믿지 않고 이걸로 서버 검증한다. 근거: spec/05 §5.2·§9.4, plan §2-D.
//
// ⚠️ 클라 게이트(useIdentity getPullimAuthState)와 별개 — 이건 **서버 라우트 전용**(쓰기 검증).
//    pullim-api 세션 쿠키는 ES256 이고 공개키 미분배라 로컬 검증 불가 → introspection 이 유일선.
import "server-only";
import { PULLIM_MODE, PULLIM_DOMAIN_API_URL } from "@/lib/auth/pullim-mode";

const INTROSPECT_TIMEOUT_MS = 2500;

/** 요청 cookie 헤더에서 `*-pullim-at` suffix 쿠키만 화이트리스트(games 쿠키 누출 방지). */
function pullimSessionCookieHeader(cookieHeader: string | null): string {
  if (!cookieHeader) return "";
  return cookieHeader
    .split(";")
    .filter((pair) => pair.split("=")[0].trim().endsWith("-pullim-at"))
    .join("; ");
}

/**
 * pullim 회원 sub 서버 확인. `*-pullim-at` 쿠키를 pullim-api `/games/me` 로 introspection.
 * 반환: 유효 회원=sub, 그 외(미인증·계약위반·pullim 모드 아님)=null. 장애(5xx·네트워크·timeout)도 null
 * (쓰기 경로는 fail-closed — 신원 미확정이면 mutation 거부).
 */
export async function resolvePullimSub(cookieHeader: string | null): Promise<string | null> {
  if (!PULLIM_MODE || !PULLIM_DOMAIN_API_URL) return null;
  const cookie = pullimSessionCookieHeader(cookieHeader);
  if (!cookie) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INTROSPECT_TIMEOUT_MS);
  try {
    const res = await fetch(`${PULLIM_DOMAIN_API_URL}/games/me`, {
      headers: { cookie },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sub?: unknown };
    return typeof data.sub === "string" && data.sub ? data.sub : null;
  } catch {
    return null; // 장애·timeout·파싱오류 = 신원 미확정 → 쓰기 거부.
  } finally {
    clearTimeout(timer);
  }
}
