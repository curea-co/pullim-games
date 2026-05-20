// Resend 외부 메일 서비스 클라이언트 (fetch 직접 호출 — SDK 의존성 0).
// SPEC §05.7.5 외부 메일 서비스 위임 정책.
//
// 핵심 정책:
// - 본 서버는 이메일을 저장하지 않는다. 본 모듈은 stateless — 함수 인자로 받은 email 을
//   Resend 에 위임한 뒤 응답을 폐기한다 (반환값에 email 포함되지 않음).
// - `RESEND_API_KEY`·`RESEND_AUDIENCE_ID` 미설정 시 `unavailable` 결과 반환 (503 처리).
// - 라우트가 결과 처리 후 즉시 GC 되도록 단순 함수 인터페이스.
//
// 응답 분기 (2026-05-20 round 5 fix — Codex 지적 #2: "exists" 부분문자열 매칭 너무 광범):
//   200·201                                 → ok: true (신규 등록)
//   HTTP 409                                → ok: true, reason: "already_exists"
//   4xx + body 에 정확한 "already exists" 두 단어 인접 매칭
//                                           → ok: true, reason: "already_exists"
//                                            (idempotent — 사용자에게는 성공으로 표시)
//   기타 4xx (validation·auth·"not exists" 등) → ok: false, reason: "external_error" (502)
//   5xx 또는 fetch throw                    → ok: false, reason: "external_error" (502)
//   secret 미설정                            → ok: false, reason: "unavailable" (503)
//
// 좁힘 근거 (round 5):
//   기존 `"exists"` 단독 substring 매칭은 다음과 같은 4xx 도 success 로 오분류했다:
//     - "audience does not exists"
//     - "api key not exists"
//     - "resource exists in another workspace"
//   실제 Resend 중복 응답은 (관찰) `"Contact already exists"` 형태로 두 단어가 인접.
//   따라서 두 단어가 공백 1회로 인접한 정규식만 매칭한다.
//
// API 레퍼런스: https://resend.com/docs/api-reference/audiences/create-contact
// 에러 코드: https://resend.com/docs/api-reference/errors

import "server-only";

export type ResendDelegationResult =
  | { ok: true; reason?: "already_exists" }
  | { ok: false; reason: "unavailable" | "external_error"; status?: number };

interface ResendDeps {
  /** 외부 fetch — 테스트에서 mock 가능. 기본값 = global fetch. */
  fetch?: typeof fetch;
  /** 환경변수 주입 — 테스트에서 mock 가능. 기본값 = process.env. */
  env?: {
    RESEND_API_KEY?: string;
    RESEND_AUDIENCE_ID?: string;
  };
}

/**
 * Resend 4xx 응답 body 에서 "이미 등록된 contact" 판정 (round 5 — 좁힘).
 *
 * 두 신호 중 하나라도 만족하면 중복으로 간주:
 *   1. HTTP status 409 (Conflict)
 *   2. body 에 "already exists" 두 단어가 공백 1회로 인접 매칭
 *
 * 이전 round 3 구현은 `"already"` 또는 `"exists"` 단독 substring 을 모두 success
 * 로 승격했으나, 그러면 다음과 같은 정상 4xx 도 침묵 성공이 된다:
 *   - "audience does not exists" (오타 또는 다른 자원)
 *   - "api key not exists"
 *   - "resource exists in another workspace"
 * 좁힘으로 false positive 차단.
 *
 * 정규식: `\balready\s+exists\b` (대소문자 무시) — word boundary 로 토큰 경계 보장,
 * 두 단어 사이 공백 1회 이상만 허용.
 */
const ALREADY_EXISTS_RE = /\balready\s+exists\b/i;

function isAlreadyExistsResponse(
  status: number,
  bodyText: string | null,
): boolean {
  if (status === 409) return true;
  if (!bodyText) return false;
  return ALREADY_EXISTS_RE.test(bodyText);
}

/**
 * Resend audience contact 등록 → 출시 시 broadcast 메일 발송 대상에 추가.
 *
 * **중요**: 본 함수는 email 을 외부에 위임한 뒤 응답에서 어떤 식별자도
 * 호출자에게 반환하지 않는다. 본 서버 측 저장 0 정책 (SPEC §05.7.5) 보장.
 *
 * 중복 등록(이미 audience 에 존재하는 email)은 사용자 관점에서 신청이 끝난 상태와
 * 동일하므로 success 로 승격한다 (round 3 Codex 지적 #1).
 *
 * @param email - 신청자 이메일 (plain). 함수 종료 시 호출자 변수도 폐기 권장.
 * @param deps - 테스트 주입용 (fetch·env). 운영에서는 기본값 사용.
 */
export async function delegateNotifySignupToResend(
  email: string,
  deps: ResendDeps = {},
): Promise<ResendDelegationResult> {
  const env = deps.env ?? {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID,
  };
  const apiKey = env.RESEND_API_KEY;
  const audienceId = env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    // 키 미설정 — 외부 의존성 없는 환경 (dev·CI·preview before secret)
    return { ok: false, reason: "unavailable" };
  }

  const fetchImpl = deps.fetch ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );
  } catch {
    // network 단절 — email 은 호출 스코프에서 GC. 호출자에게 폐기 단서만 반환.
    return { ok: false, reason: "external_error" };
  }

  if (response.ok) {
    // 응답 body 는 의도적으로 폐기 — id 등 외부 식별자 본 서버에 보관 X.
    return { ok: true };
  }

  // 4xx — 중복 contact 인지 판정 (round 3 fix #1).
  if (response.status >= 400 && response.status < 500) {
    let bodyText: string | null = null;
    try {
      bodyText = await response.text();
    } catch {
      bodyText = null;
    }
    if (isAlreadyExistsResponse(response.status, bodyText)) {
      // idempotent — 이미 등록된 상태이므로 사용자에게는 성공으로 표시.
      // bodyText 는 본 함수 스코프에서 GC. 외부 식별자 본 서버 보관 X.
      return { ok: true, reason: "already_exists" };
    }
    return { ok: false, reason: "external_error", status: response.status };
  }

  // 5xx 외부 장애.
  return { ok: false, reason: "external_error", status: response.status };
}
