// Resend 위임 클라이언트 단위 테스트.
// SPEC §05.7.5 외부 메일 서비스 위임 정책.
//
// round 8 갱신 — Codex round 8 지적:
// #1 endpoint 최신화: POST `/contacts` (audiences/{id}/contacts 폐로)
// #2 중복 contact → PATCH 재구독 보장 (`unsubscribed: false` 보정)
// #3 properties.source 마커 — `billing-launch-notify` 동봉으로 캠페인 분리

import { describe, expect, it, vi } from "vitest";
import {
  BILLING_SOURCE_MARKER,
  delegateNotifySignupToResend,
} from "./resend-client";

describe("delegateNotifySignupToResend", () => {
  it("env 미설정 (API key 없음) → unavailable + fetch 호출 0", async () => {
    const fetchSpy = vi.fn();
    const result = await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy,
      env: {},
    });
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("정상 응답 (200) → ok + 응답 body 폐기", async () => {
    const fetchSpy = vi.fn(
      () =>
        new Response(JSON.stringify({ id: "contact_123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const result = await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key" },
    });
    expect(result).toEqual({ ok: true });
    // 반환값에 외부 id 가 포함되면 안 됨 — 본 서버 저장 0 정책.
    expect(JSON.stringify(result)).not.toContain("contact_123");
  });

  it("[round 8] Bearer auth + POST /contacts 경로 + body shape 정확", async () => {
    const fetchSpy = vi.fn(() => new Response("{}", { status: 200 }));
    await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "secret-abc" },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    // round 8: 글로벌 Contacts 엔드포인트 (audiences/{id}/contacts 아님).
    expect(url).toBe("https://api.resend.com/contacts");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      authorization: "Bearer secret-abc",
      "content-type": "application/json",
    });
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.email).toBe("user@example.com");
    expect(body.unsubscribed).toBe(false);
    // round 8 #3 — properties.source 마커 필수.
    const properties = body.properties as Record<string, unknown>;
    expect(properties).toBeDefined();
    expect(properties.source).toBe(BILLING_SOURCE_MARKER);
    expect(properties.source).toBe("billing-launch-notify");
    // consented_at ISO 8601 — 동의 시점 기록.
    expect(typeof properties.consented_at).toBe("string");
    expect(properties.consented_at as string).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });

  it("[round 8] RESEND_SEGMENT_ID 설정 시 segments[].id 동봉", async () => {
    const fetchSpy = vi.fn(() => new Response("{}", { status: 200 }));
    await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key", RESEND_SEGMENT_ID: "seg_billing" },
    });
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.segments).toEqual([{ id: "seg_billing" }]);
  });

  it("[round 8] RESEND_SEGMENT_ID 미설정 시 segments 필드 미동봉", async () => {
    const fetchSpy = vi.fn(() => new Response("{}", { status: 200 }));
    await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key" },
    });
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.segments).toBeUndefined();
  });

  it("[round 8] legacy RESEND_AUDIENCE_ID 존재해도 새 경로/페이로드 사용", async () => {
    // round 8 이전 환경변수가 남아 있어도 신경로는 audience 를 무시한다.
    const fetchSpy = vi.fn(() => new Response("{}", { status: 200 }));
    await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "legacy-aud" },
    });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/contacts");
    expect(url).not.toContain("audiences");
    expect(url).not.toContain("legacy-aud");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    // legacy audience id 가 페이로드에도 새지 않음.
    expect(JSON.stringify(body)).not.toContain("legacy-aud");
  });

  it("Resend 4xx (auth 403) 응답 → external_error + status 보존", async () => {
    const fetchSpy = vi.fn(() => new Response("forbidden", { status: 403 }));
    const result = await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key" },
    });
    expect(result).toEqual({
      ok: false,
      reason: "external_error",
      status: 403,
    });
  });

  it("Resend 5xx 응답 → external_error + status 보존", async () => {
    const fetchSpy = vi.fn(() => new Response("oops", { status: 503 }));
    const result = await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key" },
    });
    expect(result).toEqual({
      ok: false,
      reason: "external_error",
      status: 503,
    });
  });

  // Codex round 3·5·8 회귀 — 중복 등록은 idempotent + 재구독 보장.
  describe("중복 등록 → 재구독 보장 분기 (round 3·5·8 fix)", () => {
    /**
     * 표준 mock 패턴: POST → 409, 그 직후 PATCH → 200.
     * fetchSpy 호출 순서로 두 단계 검증.
     */
    function makeDuplicateThenPatchSuccessFetch(initialStatus: number, initialBody: string) {
      let callCount = 0;
      return vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return new Response(initialBody, { status: initialStatus });
        }
        // 2번째 호출 = PATCH 재구독.
        return new Response("{}", { status: 200 });
      });
    }

    it("HTTP 409 Conflict → POST 다음 PATCH 호출 + ok: true reason: resubscribed", async () => {
      const fetchSpy = makeDuplicateThenPatchSuccessFetch(
        409,
        JSON.stringify({ name: "validation_error" }),
      );
      const result = await delegateNotifySignupToResend("dup@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key" },
      });
      expect(result).toEqual({ ok: true, reason: "resubscribed" });
      // POST + PATCH = 2 호출.
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const [patchUrl, patchInit] = fetchSpy.mock.calls[1] as unknown as [
        string,
        RequestInit,
      ];
      // PATCH `/contacts/{email}` — by-email 식별.
      expect(patchUrl).toBe(
        `https://api.resend.com/contacts/${encodeURIComponent("dup@example.com")}`,
      );
      expect(patchInit.method).toBe("PATCH");
      const patchBody = JSON.parse(patchInit.body as string) as Record<
        string,
        unknown
      >;
      // round 8 #2 — unsubscribed: false 로 재구독.
      expect(patchBody.unsubscribed).toBe(false);
      // source 마커 idempotent 재set.
      const props = patchBody.properties as Record<string, unknown>;
      expect(props.source).toBe(BILLING_SOURCE_MARKER);
    });

    it("HTTP 422 + 'Contact already exists' → PATCH 재구독", async () => {
      const fetchSpy = makeDuplicateThenPatchSuccessFetch(
        422,
        JSON.stringify({
          name: "validation_error",
          message: "Contact already exists in this audience",
        }),
      );
      const result = await delegateNotifySignupToResend("dup2@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key" },
      });
      expect(result).toEqual({ ok: true, reason: "resubscribed" });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("HTTP 422 + 대문자 'Already Exists' (대소문자 무시) → PATCH 재구독", async () => {
      const fetchSpy = makeDuplicateThenPatchSuccessFetch(
        422,
        JSON.stringify({ message: "Already Exists in audience" }),
      );
      const result = await delegateNotifySignupToResend("dup3@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key" },
      });
      expect(result).toEqual({ ok: true, reason: "resubscribed" });
    });

    it("HTTP 422 + 일반 validation error (already exists 키워드 없음) → external_error + PATCH 호출 0", async () => {
      const fetchSpy = vi.fn(
        () =>
          new Response(
            JSON.stringify({
              name: "validation_error",
              message: "Invalid email format",
            }),
            { status: 422 },
          ),
      );
      const result = await delegateNotifySignupToResend("bad@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key" },
      });
      expect(result).toEqual({
        ok: false,
        reason: "external_error",
        status: 422,
      });
      // 중복 판정 실패 → PATCH 호출 안 함 (POST 1회만).
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("HTTP 401 missing_api_key → external_error + PATCH 호출 0", async () => {
      const fetchSpy = vi.fn(
        () =>
          new Response(
            JSON.stringify({ name: "missing_api_key" }),
            { status: 401 },
          ),
      );
      const result = await delegateNotifySignupToResend("user@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("external_error");
        expect(result.status).toBe(401);
      }
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // round 8 #2 추가 — PATCH 자체가 실패하는 경우.
    it("[round 8] POST 409 → PATCH 4xx → ok=false external_error (재구독 실패 노출)", async () => {
      let callCount = 0;
      const fetchSpy = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return new Response("{}", { status: 409 });
        }
        // PATCH 자체 실패 — 재구독 보정이 안 됐으면 사용자에게 success 노출 X.
        return new Response("not found", { status: 404 });
      });
      const result = await delegateNotifySignupToResend("dup@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key" },
      });
      expect(result).toEqual({
        ok: false,
        reason: "external_error",
        status: 404,
      });
    });

    it("[round 8] POST 409 → PATCH network 단절 → external_error", async () => {
      let callCount = 0;
      const fetchSpy = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return new Response("{}", { status: 409 }) as unknown as Response;
        }
        throw new Error("ECONNRESET on PATCH");
      });
      const result = await delegateNotifySignupToResend("dup@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("external_error");
      }
    });

    // Codex round 5 회귀 — substring "exists" / "already" 단독은 false positive.
    describe("[round 5] 정밀 매칭 false positive 방지 — PATCH 호출되지 않음 검증", () => {
      it("HTTP 404 'audience does not exists' → external_error (PATCH 호출 0)", async () => {
        const fetchSpy = vi.fn(
          () =>
            new Response(
              JSON.stringify({ message: "Audience does not exists" }),
              { status: 404 },
            ),
        );
        const result = await delegateNotifySignupToResend("u@example.com", {
          fetch: fetchSpy as unknown as typeof fetch,
          env: { RESEND_API_KEY: "key" },
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe("external_error");
          expect(result.status).toBe(404);
        }
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      it("HTTP 401 'api key not exists' → external_error (PATCH 호출 0)", async () => {
        const fetchSpy = vi.fn(
          () =>
            new Response(
              JSON.stringify({ message: "API key not exists" }),
              { status: 401 },
            ),
        );
        const result = await delegateNotifySignupToResend("u@example.com", {
          fetch: fetchSpy as unknown as typeof fetch,
          env: { RESEND_API_KEY: "key" },
        });
        expect(result.ok).toBe(false);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      it("HTTP 400 'resource exists in another workspace' → external_error (PATCH 호출 0)", async () => {
        const fetchSpy = vi.fn(
          () =>
            new Response(
              JSON.stringify({
                message: "Resource exists in another workspace",
              }),
              { status: 400 },
            ),
        );
        const result = await delegateNotifySignupToResend("u@example.com", {
          fetch: fetchSpy as unknown as typeof fetch,
          env: { RESEND_API_KEY: "key" },
        });
        expect(result.ok).toBe(false);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      it("HTTP 400 'already pending' (already 단독) → external_error (PATCH 호출 0)", async () => {
        const fetchSpy = vi.fn(
          () =>
            new Response(
              JSON.stringify({ message: "Request already pending" }),
              { status: 400 },
            ),
        );
        const result = await delegateNotifySignupToResend("u@example.com", {
          fetch: fetchSpy as unknown as typeof fetch,
          env: { RESEND_API_KEY: "key" },
        });
        expect(result.ok).toBe(false);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  it("fetch throw → external_error", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("ECONNRESET");
    });
    const result = await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("external_error");
    }
  });
});
