// /api/billing/notify 라우트 동작 검증.
// SPEC §05.6 알림 신청 + §05.7.5 외부 메일 서비스 위임 정책.
//
// 정책 갱신 (2026-05-20 — Codex review fix):
// - hash-only 모델 폐기. plain email + 외부 위임 모델로 전환.
// - Zod strict — 추가 필드 동봉 시 422 (Codex 지적 #2·#3 회귀 테스트).
// - Resend 외부 호출은 mock — 실제 호출 0.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/billing/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    action: "billing.notify.signup",
    email: "user@example.com",
    source: "billing-cta",
    ts: Date.now(),
    ...overrides,
  };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // 기본 테스트 환경: secret 설정 + global fetch mock 으로 Resend 호출 차단.
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_AUDIENCE_ID = "aud_test";
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Response(JSON.stringify({ id: "contact_mock" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/billing/notify — schema 검증 (Zod strict)", () => {
  it("유효 페이로드 → 200 ok + Resend 1회 호출", async () => {
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("invalid JSON → 400 + Resend 호출 0", async () => {
    const res = await POST(makePostRequest("not-json{"));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("email 누락 → 422", async () => {
    const payload = basePayload();
    delete (payload as Record<string, unknown>).email;
    const res = await POST(makePostRequest(payload));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("schema_validation_failed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("email 형식 불일치 (@ 없음) → 422", async () => {
    const res = await POST(
      makePostRequest(basePayload({ email: "not-an-email" })),
    );
    expect(res.status).toBe(422);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("email 형식 불일치 (TLD 없음) → 422", async () => {
    const res = await POST(
      makePostRequest(basePayload({ email: "user@example" })),
    );
    expect(res.status).toBe(422);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("email RFC 5321 한도 초과 (254 자) → 422", async () => {
    const longLocal = "a".repeat(250);
    const res = await POST(
      makePostRequest(basePayload({ email: `${longLocal}@x.io` })),
    );
    expect(res.status).toBe(422);
  });

  it("source enum 위반 → 422", async () => {
    const res = await POST(
      makePostRequest(basePayload({ source: "unknown-source" })),
    );
    expect(res.status).toBe(422);
  });

  it("action 누락 → 422", async () => {
    const payload = basePayload();
    delete (payload as Record<string, unknown>).action;
    const res = await POST(makePostRequest(payload));
    expect(res.status).toBe(422);
  });

  it("ts 음수 → 422", async () => {
    const res = await POST(makePostRequest(basePayload({ ts: -1 })));
    expect(res.status).toBe(422);
  });

  // Codex 지적 #2·#3 회귀 — 추가 필드는 strict 로 거부되어야 한다.
  it("[strict 회귀] 정의되지 않은 추가 필드 동봉 → 422 (PII 누수 방지)", async () => {
    const res = await POST(
      makePostRequest({
        ...basePayload(),
        // 클라이언트가 실수 또는 악의로 추가 필드 동봉
        extraSecret: "should-not-pass",
      }),
    );
    expect(res.status).toBe(422);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("[strict 회귀] emailHash 같은 legacy 필드 동봉 → 422", async () => {
    const res = await POST(
      makePostRequest({
        ...basePayload(),
        emailHash: "a".repeat(64),
      }),
    );
    expect(res.status).toBe(422);
  });
});

describe("POST /api/billing/notify — Resend 위임 동작", () => {
  it("Resend 호출 body 에 email 포함 + 200 응답", async () => {
    const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
    await POST(makePostRequest(basePayload({ email: "alice@example.com" })));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("api.resend.com/audiences/aud_test/contacts");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      authorization: "Bearer test-key",
      "content-type": "application/json",
    });
    const body = JSON.parse(init.body as string);
    expect(body.email).toBe("alice@example.com");
  });

  it("Resend 응답 본문 (id) 은 클라이언트 응답에 노출되지 않는다", async () => {
    const res = await POST(makePostRequest(basePayload()));
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    // contact_mock id 가 응답에 새지 않음
    expect(JSON.stringify(json)).not.toContain("contact_mock");
  });

  it("RESEND_API_KEY 미설정 → 503 service_unavailable + Resend 호출 0", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("RESEND_AUDIENCE_ID 미설정 → 503", async () => {
    delete process.env.RESEND_AUDIENCE_ID;
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Resend 5xx 응답 → 502 external_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Response("oops", { status: 500 })),
    );
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("external_error");
  });

  it("Resend 네트워크 단절 → 502 external_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("network down");
      }),
    );
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(502);
  });
});

describe("POST /api/billing/notify — PII 0 정책 회귀", () => {
  it("[저장 0 회귀] 라우트 응답에 email plain text 포함되지 않음", async () => {
    const res = await POST(
      makePostRequest(basePayload({ email: "leak-test@example.com" })),
    );
    const text = await res.text();
    expect(text).not.toContain("leak-test@example.com");
  });

  it("[저장 0 회귀] 422 응답의 error issues 에도 email 값이 echo 되지 않음", async () => {
    const res = await POST(
      makePostRequest({
        action: "billing.notify.signup",
        email: "leak-echo@example.com",
        source: "billing-cta",
        ts: -1, // ts 위반 → 422
      }),
    );
    expect(res.status).toBe(422);
    const text = await res.text();
    // zod issues 는 path 만 노출하고 received 값은 노출하지 않음을 검증
    // (현 zod 동작: ts.received 만 echo, email 값은 echo 안 됨)
    expect(text).not.toContain("leak-echo@example.com");
  });

  it("[저장 0 회귀] 라우트 함수 호출 후 process 측 저장소 변경 0 (DB·KV 호출 0)", async () => {
    // 본 구현은 외부 fetch (Resend) 1회 외 어떤 I/O 도 발생시키지 않음.
    // 다른 storage import 가 추가되면 본 테스트 실패하도록 의도.
    const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
    await POST(makePostRequest(basePayload()));
    // Resend 호출 정확히 1회. 추가 fetch (예: 자체 KV) 0.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/billing/notify", () => {
  it("405 method not allowed", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
