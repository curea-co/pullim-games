// Resend 외부 메일 서비스 클라이언트 (fetch 직접 호출 — SDK 의존성 0).
// SPEC §05.7.5 외부 메일 서비스 위임 정책.
//
// 핵심 정책:
// - 본 서버는 이메일을 저장하지 않는다. 본 모듈은 stateless — 함수 인자로 받은 email 을
//   Resend 에 위임한 뒤 응답을 폐기한다 (반환값에 email 포함되지 않음).
// - `RESEND_API_KEY`·`RESEND_AUDIENCE_ID` 미설정 시 `unavailable` 결과 반환 (503 처리).
// - 라우트가 결과 처리 후 즉시 GC 되도록 단순 함수 인터페이스.
//
// API 레퍼런스: https://resend.com/docs/api-reference/audiences/create-contact

import "server-only";

export type ResendDelegationResult =
  | { ok: true }
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
 * Resend audience contact 등록 → 출시 시 broadcast 메일 발송 대상에 추가.
 *
 * **중요**: 본 함수는 email 을 외부에 위임한 뒤 응답에서 어떤 식별자도
 * 호출자에게 반환하지 않는다. 본 서버 측 저장 0 정책 (SPEC §05.7.5) 보장.
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

  if (!response.ok) {
    return { ok: false, reason: "external_error", status: response.status };
  }

  // 응답 body 는 의도적으로 폐기 — id 등 외부 식별자 본 서버에 보관 X.
  return { ok: true };
}
