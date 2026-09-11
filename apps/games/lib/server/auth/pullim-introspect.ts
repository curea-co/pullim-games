// pullim 모드 서버측 신원 확인 — 요청의 `*-pullim-at` 쿠키를 pullim-api `GET /games/me` 로
// introspection 해 회원 `sub` 를 얻는다. mutation 라우트(grade 저장 등)는 클라가 준 sub 를
// 믿지 않고 이걸로 서버 검증한다. 근거: spec/05 §5.2·§9.4, plan §2-D.
//
// ⚠️ 클라 게이트(useIdentity getPullimAuthState)와 별개 — 이건 **서버 라우트 전용**(쓰기 검증).
//    pullim-api 세션 쿠키는 ES256 이고 공개키 미분배라 로컬 검증 불가 → introspection 이 유일선.
import "server-only";
import { z } from "zod";
import { PULLIM_MODE, PULLIM_DOMAIN_API_URL } from "@/lib/auth/pullim-mode";

const INTROSPECT_TIMEOUT_MS = 2500;
// 현재 /games/me DTO와 이전 최소 응답을 함께 검증한다. 알 수 없는 필드는 계약 드리프트다.
const GamesMeSchema = z.object({
  sub: z.string().trim().min(1),
  emailMatchHash: z.string().trim().min(1).nullish(),
  globalRole: z.enum(["admin", "user"]).optional(),
  gamesFlagLevel: z.number().nullable().optional(),
  displayName: z.string().nullable().optional(),
}).strict();

/** 요청 cookie 헤더에서 `*-pullim-at` suffix 쿠키만 화이트리스트(games 쿠키 누출 방지). */
function pullimSessionCookieHeader(cookieHeader: string | null): string {
  if (!cookieHeader) return "";
  return cookieHeader
    .split(";")
    .filter((pair) => pair.split("=")[0].trim().endsWith("-pullim-at"))
    .join("; ");
}

/**
 * introspection 결과 — **미인증(401)과 장애(5xx·네트워크·timeout)를 구분**한다(Codex #146).
 * `unavailable=true` 면 pullim-api 일시 장애 → 라우트는 401 아닌 503 으로 내려 로그인 회원을
 * 미인증으로 재분류하지 않는다(§5.2 2단 게이트: 5xx·네트워크는 fail-open/unavailable).
 * 쓰기(mutation)는 sub 확정(`unavailable=false && sub`)일 때만 진행(fail-closed).
 */
export type PullimSubResult = {
  sub: string | null;
  unavailable: boolean;
  /**
   * P-B 재연결 대조용 email 지문(핸드오프 §1). pullim-api 가 검증된 email 을 공유 salt 로 HMAC 한 값.
   * salt 미프로비저닝·게스트·행 없음이면 `null`(재연결 dormant). **평문 email 아님** — 해시만 경계 통과(§5.6).
   * 미인증(401)·장애(unavailable) 응답에선 항상 `null`.
   */
  emailMatchHash: string | null;
};

/**
 * pullim 회원 sub 서버 확인. `*-pullim-at` 쿠키를 pullim-api `/games/me` 로 introspection.
 * - 200+sub → `{sub, unavailable:false}`  · **401** → `{sub:null, unavailable:false}`(미인증 확정)
 * - **5xx·네트워크·timeout·403·기타 4xx** → `{sub:null, unavailable:true}`(장애/오설정 — 503 매핑)
 *   ⚠️ 403(EntitlementGuard 오장착 등 계약 드리프트)을 401 로 접으면 misconfiguration 을 로그인
 *   회원의 "미인증"으로 숨긴다(§5.2·R1) → 401 만 미인증, 나머지 비정상은 surface(Codex #146).
 * - pullim 모드 아님·pullim-at 쿠키 없음 → `{sub:null, unavailable:false}`
 */
export async function resolvePullimSub(cookieHeader: string | null): Promise<PullimSubResult> {
  if (!PULLIM_MODE || !PULLIM_DOMAIN_API_URL)
    return { sub: null, unavailable: false, emailMatchHash: null };
  const cookie = pullimSessionCookieHeader(cookieHeader);
  if (!cookie) return { sub: null, unavailable: false, emailMatchHash: null };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INTROSPECT_TIMEOUT_MS);
  try {
    const res = await fetch(`${PULLIM_DOMAIN_API_URL}/games/me`, {
      headers: { cookie },
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.ok) {
      const parsed = GamesMeSchema.safeParse(await res.json());
      if (!parsed.success) return { sub: null, unavailable: true, emailMatchHash: null };
      return { sub: parsed.data.sub, unavailable: false, emailMatchHash: parsed.data.emailMatchHash ?? null };
    }
    // 401 만 미인증(닫힘). 403·기타 4xx·5xx = 오설정/장애 → surface(unavailable, 503 매핑).
    return { sub: null, unavailable: res.status !== 401, emailMatchHash: null };
  } catch {
    return { sub: null, unavailable: true, emailMatchHash: null }; // 네트워크·timeout·파싱오류 = 장애.
  } finally {
    clearTimeout(timer);
  }
}
