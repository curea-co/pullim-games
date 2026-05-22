// Resend 외부 메일 서비스 클라이언트 (fetch 직접 호출 — SDK 의존성 0).
// SPEC §05.7.5 외부 메일 서비스 위임 정책.
//
// 핵심 정책:
// - 본 서버는 이메일을 저장하지 않는다. 본 모듈은 stateless — 함수 인자로 받은 email 을
//   Resend 에 위임한 뒤 응답을 폐기한다 (반환값에 email 포함되지 않음).
// - `RESEND_API_KEY` 미설정 시 `unavailable` 결과 반환 (503 처리).
//   `RESEND_AUDIENCE_ID` 는 round 8 이후 optional — 글로벌 Contacts 모델에서는 audience
//   대신 contact properties 의 `source` 마커로 캠페인을 분리한다. 단 segment id 가
//   설정돼 있으면 contact 를 해당 segment 에 즉시 추가한다.
// - 라우트가 결과 처리 후 즉시 GC 되도록 단순 함수 인터페이스.
//
// 응답 분기 (2026-05-20 round 5·8 fix):
//   200·201                                 → ok: true (신규 등록)
//   HTTP 409                                → 중복 → PATCH 재구독 보장 (round 8 #2)
//   4xx + body 에 정확한 "already exists" 두 단어 인접 매칭
//                                           → 중복 → PATCH 재구독 보장 (round 8 #2)
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
// round 8 보정 (Codex round 8 지적):
//   #1 Resend 최신 API 경로/모델 정합 — `POST /contacts` (audiences/{id}/contacts 폐로).
//      `properties.source`·`segments` 동봉으로 캠페인 분리 식별자 추가.
//   #2 중복 contact 분기 — `unsubscribed: true` 잔존자 재구독 보장 (`PATCH /contacts/{email}`
//      with `unsubscribed: false`). 분기 reason 을 `resubscribed` 로 노출.
//   #3 segment/property 마커 — 모든 신규 contact 에 `properties.source =
//      'billing-launch-notify'` 동봉. 운영상 "출시 알림 외 용도 사용 안 함" 강제.
//
// API 레퍼런스:
//   POST   https://api.resend.com/contacts            (create)
//   PATCH  https://api.resend.com/contacts/{email}    (update — by-email 식별 OK)
//   참조:  https://resend.com/docs/api-reference/contacts/create-contact
//          https://resend.com/docs/api-reference/contacts/update-contact

import "server-only";

/**
 * Resend contact properties 의 source 마커.
 *
 * 본 라우트가 생성하는 모든 contact 에 동봉돼 운영 측에서 다음을 강제 가능:
 *   - 출시 broadcast 발송 시 `properties.source = 'billing-launch-notify'` 만 필터
 *   - 다른 캠페인이 같은 audience/segment 를 공유해도 본 source 외 contact 미사용
 *
 * SPEC §05.7.5 "출시 알림 외 용도로는 사용하지 않는다" 의 운영 강제 수단.
 */
export const BILLING_SOURCE_MARKER = "billing-launch-notify" as const;

export type ResendDelegationResult =
  | { ok: true; reason?: "already_exists" | "resubscribed" }
  | { ok: false; reason: "unavailable" | "external_error"; status?: number };

interface ResendDeps {
  /** 외부 fetch — 테스트에서 mock 가능. 기본값 = global fetch. */
  fetch?: typeof fetch;
  /** 환경변수 주입 — 테스트에서 mock 가능. 기본값 = process.env. */
  env?: {
    RESEND_API_KEY?: string;
    /**
     * 선택 — 설정 시 contact 생성 페이로드에 `segments: [{ id }]` 동봉돼 즉시 해당
     * segment 에 추가된다. 미설정 시 `properties.source` 마커만으로 캠페인 분리.
     */
    RESEND_SEGMENT_ID?: string;
    /**
     * deprecated (round 8) — 이전 audiences/{id}/contacts 경로용. 더 이상 사용하지
     * 않지만 미사용 시에도 환경에 남아있을 수 있어 schema 호환만 유지. 신경로는 무시.
     */
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
 * Resend contact 생성 페이로드 — round 8 최신 API 정합.
 *
 * - `email`: 식별자 (필수)
 * - `unsubscribed: false`: 명시적 구독 상태 (broadcast 발송 대상)
 * - `properties.source`: 캠페인 마커 — 운영 측 broadcast 필터 강제 수단
 * - `properties.consented_at`: 신청 시각 (ISO 8601) — 동의 시점 기록
 * - `segments`: 선택 — `RESEND_SEGMENT_ID` 가 있으면 [{ id }] 로 즉시 segment 부착
 */
function buildCreatePayload(
  email: string,
  segmentId: string | undefined,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    email,
    unsubscribed: false,
    properties: {
      source: BILLING_SOURCE_MARKER,
      consented_at: new Date().toISOString(),
    },
  };
  if (segmentId) {
    payload.segments = [{ id: segmentId }];
  }
  return payload;
}

/**
 * Resend contact 재구독 — PATCH `https://api.resend.com/contacts/{email}` 로
 * `unsubscribed: false` 보정. round 8 fix #2.
 *
 * 중복 contact 가 과거에 `unsubscribed: true` 상태였다면 단순 `already_exists` 처리
 * 만으로는 broadcast 수신 대상이 되지 않아 사용자에게 거짓 성공을 보이게 된다.
 * 본 PATCH 가 이를 보정해 "신청됐어요" UI 와 실제 발송 대상 상태를 일치시킨다.
 *
 * PATCH 도 같은 properties.source 를 다시 set 해 향후 마이그레이션 시 누락된 마커가
 * 보정되게 한다 (idempotent).
 *
 * @returns
 *   ok=true · reason='resubscribed' — PATCH 2xx (재구독 보정 성공 또는 변경 없음)
 *   ok=false · reason='external_error' — PATCH 자체가 4xx/5xx (보정 실패)
 */
async function resubscribeContact(
  fetchImpl: typeof fetch,
  apiKey: string,
  email: string,
): Promise<ResendDelegationResult> {
  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.resend.com/contacts/${encodeURIComponent(email)}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          unsubscribed: false,
          properties: {
            source: BILLING_SOURCE_MARKER,
            consented_at: new Date().toISOString(),
          },
        }),
      },
    );
  } catch {
    return { ok: false, reason: "external_error" };
  }

  if (response.ok) {
    // PATCH 응답 body 폐기 — 외부 id 본 서버 보관 X.
    return { ok: true, reason: "resubscribed" };
  }

  return { ok: false, reason: "external_error", status: response.status };
}

/**
 * Resend contact 등록 → 출시 시 broadcast 메일 발송 대상에 추가.
 *
 * round 8 최신 API:
 *   - POST `https://api.resend.com/contacts` (글로벌 Contacts 모델)
 *   - audience id 대신 `properties.source` + 선택적 `segments[].id` 로 캠페인 분리
 *
 * **중요**: 본 함수는 email 을 외부에 위임한 뒤 응답에서 어떤 식별자도
 * 호출자에게 반환하지 않는다. 본 서버 측 저장 0 정책 (SPEC §05.7.5) 보장.
 *
 * 중복 등록(이미 존재하는 email)은 단순 success 가 아닌 **재구독 보장** 분기로 처리:
 *   1) POST 응답이 409 또는 "already exists" 매칭이면
 *   2) PATCH `/contacts/{email}` 로 `unsubscribed: false` + source 마커 재set
 *   3) 사용자에게 success 노출 — 실제 발송 대상 상태와 UI 가 일치
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
    RESEND_SEGMENT_ID: process.env.RESEND_SEGMENT_ID,
    RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID,
  };
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    // 키 미설정 — 외부 의존성 없는 환경 (dev·CI·preview before secret)
    return { ok: false, reason: "unavailable" };
  }

  const fetchImpl = deps.fetch ?? fetch;
  const createPayload = buildCreatePayload(email, env.RESEND_SEGMENT_ID);

  let response: Response;
  try {
    response = await fetchImpl("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(createPayload),
    });
  } catch {
    // network 단절 — email 은 호출 스코프에서 GC. 호출자에게 폐기 단서만 반환.
    return { ok: false, reason: "external_error" };
  }

  if (response.ok) {
    // 응답 body 는 의도적으로 폐기 — id 등 외부 식별자 본 서버에 보관 X.
    return { ok: true };
  }

  // 4xx — 중복 contact 인지 판정 + 재구독 보장 분기.
  if (response.status >= 400 && response.status < 500) {
    let bodyText: string | null = null;
    try {
      bodyText = await response.text();
    } catch {
      bodyText = null;
    }
    if (isAlreadyExistsResponse(response.status, bodyText)) {
      // round 8 fix #2 — 단순 success 가 아닌 PATCH 로 재구독 보장.
      //   * 과거 unsubscribed=true 잔존자 → unsubscribed=false 로 보정
      //   * 이미 false 였던 경우도 source 마커 idempotent 재set
      //   * bodyText·email 변수는 본 함수 스코프에서 GC.
      return resubscribeContact(fetchImpl, apiKey, email);
    }
    return { ok: false, reason: "external_error", status: response.status };
  }

  // 5xx 외부 장애.
  return { ok: false, reason: "external_error", status: response.status };
}
