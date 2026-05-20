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

  it("Resend 4xx 응답 → external_error + status 보존", async () => {
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
