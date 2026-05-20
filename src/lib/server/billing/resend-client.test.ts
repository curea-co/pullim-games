// Resend 위임 클라이언트 단위 테스트.
// SPEC §05.7.5 외부 메일 서비스 위임 정책.

import { describe, expect, it, vi } from "vitest";
import { delegateNotifySignupToResend } from "./resend-client";

describe("delegateNotifySignupToResend", () => {
  it("env 미설정 → unavailable + fetch 호출 0", async () => {
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
      env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
    });
    expect(result).toEqual({ ok: true });
    // 반환값에 외부 id 가 포함되면 안 됨 — 본 서버 저장 0 정책.
    expect(JSON.stringify(result)).not.toContain("contact_123");
  });

  it("Bearer auth header + audience id path 정확 구성", async () => {
    const fetchSpy = vi.fn(() => new Response("{}", { status: 200 }));
    await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "secret-abc", RESEND_AUDIENCE_ID: "aud_xyz" },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/audiences/aud_xyz/contacts");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      authorization: "Bearer secret-abc",
      "content-type": "application/json",
    });
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: "user@example.com", unsubscribed: false });
  });

  it("audience id 특수문자 URL-encode", async () => {
    const fetchSpy = vi.fn(() => new Response("{}", { status: 200 }));
    await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud/with space" },
    });
    const [url] = fetchSpy.mock.calls[0] as unknown as [string];
    expect(url).toContain("aud%2Fwith%20space");
  });

  it("Resend 4xx (auth 403) 응답 → external_error + status 보존", async () => {
    const fetchSpy = vi.fn(() => new Response("forbidden", { status: 403 }));
    const result = await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
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
      env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
    });
    expect(result).toEqual({
      ok: false,
      reason: "external_error",
      status: 503,
    });
  });

  // Codex round 3 지적 #1 회귀 — 중복 등록은 idempotent success.
  describe("중복 등록 idempotent 분기 (round 3 fix)", () => {
    it("HTTP 409 Conflict → ok: true + reason: already_exists", async () => {
      const fetchSpy = vi.fn(
        () =>
          new Response(JSON.stringify({ name: "validation_error" }), {
            status: 409,
          }),
      );
      const result = await delegateNotifySignupToResend("dup@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
      });
      expect(result).toEqual({ ok: true, reason: "already_exists" });
    });

    it("HTTP 422 + body 'already exists' → ok: true + reason: already_exists", async () => {
      const fetchSpy = vi.fn(
        () =>
          new Response(
            JSON.stringify({
              name: "validation_error",
              message: "Contact already exists in this audience",
            }),
            { status: 422 },
          ),
      );
      const result = await delegateNotifySignupToResend("dup2@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
      });
      expect(result).toEqual({ ok: true, reason: "already_exists" });
    });

    it("HTTP 400 + body 에 'already' 키워드 → idempotent success", async () => {
      const fetchSpy = vi.fn(
        () =>
          new Response(
            JSON.stringify({
              message: "Email has already been registered",
            }),
            { status: 400 },
          ),
      );
      const result = await delegateNotifySignupToResend("dup3@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
      });
      expect(result).toEqual({ ok: true, reason: "already_exists" });
    });

    it("HTTP 422 + 일반 validation error (already 키워드 없음) → external_error 유지", async () => {
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
        env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
      });
      expect(result).toEqual({
        ok: false,
        reason: "external_error",
        status: 422,
      });
    });

    it("HTTP 401 missing_api_key → external_error (already 키워드 없음)", async () => {
      const fetchSpy = vi.fn(
        () =>
          new Response(
            JSON.stringify({ name: "missing_api_key" }),
            { status: 401 },
          ),
      );
      const result = await delegateNotifySignupToResend("user@example.com", {
        fetch: fetchSpy as unknown as typeof fetch,
        env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("external_error");
        expect(result.status).toBe(401);
      }
    });
  });

  it("fetch throw → external_error", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("ECONNRESET");
    });
    const result = await delegateNotifySignupToResend("user@example.com", {
      fetch: fetchSpy as unknown as typeof fetch,
      env: { RESEND_API_KEY: "key", RESEND_AUDIENCE_ID: "aud" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("external_error");
    }
  });
});
