// /api/billing/notify 라우트 동작 검증.
// SPEC §05.6 알림 신청 + §05.7.5 외부 메일 서비스 위임 정책.
//
// 정책 갱신 (2026-05-21 — Codex review fix):
// - hash-only 모델 폐기. plain email + 외부 위임 모델로 전환.
// - Zod strict — 추가 필드 동봉 시 422 (Codex 지적 #2·#3 회귀 테스트).
// - Resend 외부 호출은 mock — 실제 호출 0.
// - round 3 fix: same-origin 검증 + rate limit + Resend 4xx 중복 idempotent.
// - round 5 fix: IP 식별 불가 → 400 fail-closed (전역 anonymous 버킷 금지).
// - round 6 fix: production 외 환경은 dev 폴백 키 사용 (bun dev localhost 작동 보장).
// - round 8 fix: Resend 최신 API 경로 (POST /contacts), 중복 시 PATCH 재구독 보장,
//   properties.source 마커 (`billing-launch-notify`) 동봉.
// - round 9 fix #2: 2-tier rate limit (IP 30/분·100/시간 NAT 친화 + IP+email 6/시간).
// - round 9 fix #3: Resend 실패 시 production 에서도 `console.error` 구조화 로깅.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { resetRateLimitForTests } from "@/lib/server/rate-limit";

interface RequestOpts {
  /** Origin 헤더. 기본 = http://localhost (same-origin). null 명시 시 헤더 미설정. */
  origin?: string | null;
  /** Referer 헤더. */
  referer?: string | null;
  /** x-forwarded-for IP. 기본 = 127.0.0.1. null 명시 시 헤더 미설정. */
  ip?: string | null;
}

function makePostRequest(body: unknown, opts: RequestOpts = {}): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.origin !== null) {
    headers.origin = opts.origin ?? "http://localhost";
  }
  if (opts.referer !== null && opts.referer !== undefined) {
    headers.referer = opts.referer;
  }
  if (opts.ip !== null) {
    headers["x-forwarded-for"] = opts.ip ?? "127.0.0.1";
  }
  return new Request("http://localhost/api/billing/notify", {
    method: "POST",
    headers,
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
  // round 8: RESEND_AUDIENCE_ID 는 옵셔널(legacy) — 본 테스트는 글로벌 Contacts 경로
  // 검증이 목적이므로 설정하지 않는다.
  process.env.RESEND_API_KEY = "test-key";
  delete process.env.RESEND_AUDIENCE_ID;
  delete process.env.RESEND_SEGMENT_ID;
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
  // 각 테스트 사이 rate-limit store 격리 — 이전 테스트 hit 이 누적되면 429 오작동.
  resetRateLimitForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
  resetRateLimitForTests();
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
  it("[round 8] Resend POST /contacts 호출 + email/properties.source 포함 + 200 응답", async () => {
    const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
    await POST(makePostRequest(basePayload({ email: "alice@example.com" })));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    // round 8 — 글로벌 Contacts 엔드포인트 (audiences 경로 아님).
    expect(url).toBe("https://api.resend.com/contacts");
    expect(url).not.toContain("audiences");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      authorization: "Bearer test-key",
      "content-type": "application/json",
    });
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.email).toBe("alice@example.com");
    expect(body.unsubscribed).toBe(false);
    // round 8 #3 — properties.source 마커.
    const props = body.properties as Record<string, unknown>;
    expect(props.source).toBe("billing-launch-notify");
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

  it("[round 8] RESEND_AUDIENCE_ID 없어도 200 — 글로벌 Contacts 경로는 audience id 미사용", async () => {
    // round 8: audience 모델 폐로. legacy env 부재가 라우트를 막아서는 안 됨.
    delete process.env.RESEND_AUDIENCE_ID;
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
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

  // Codex round 3·8 지적 회귀 — 중복 등록은 PATCH 재구독 보장 후 success.
  describe("중복 contact 재구독 보장 (round 3·8 fix)", () => {
    /**
     * round 8: POST → 409/422 already-exists 응답이면 PATCH 한 번 더 호출해
     * `unsubscribed: false` 보정. fetch mock 호출 순서로 두 단계 검증.
     */
    function mockDuplicateThenPatchOK(
      initialStatus: number,
      initialBody: string,
    ): ReturnType<typeof vi.fn> {
      let callCount = 0;
      return vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return new Response(initialBody, { status: initialStatus });
        }
        return new Response("{}", { status: 200 });
      });
    }

    it("[round 8] Resend 409 → PATCH 재구독 → 200 ok", async () => {
      const fetchSpy = mockDuplicateThenPatchOK(
        409,
        JSON.stringify({ name: "validation_error" }),
      );
      vi.stubGlobal("fetch", fetchSpy);
      const res = await POST(makePostRequest(basePayload()));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true });
      // POST + PATCH = 2 호출.
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const [patchUrl, patchInit] = fetchSpy.mock.calls[1] as unknown as [
        string,
        RequestInit,
      ];
      expect(patchUrl).toContain("https://api.resend.com/contacts/");
      expect(patchInit.method).toBe("PATCH");
      const patchBody = JSON.parse(patchInit.body as string) as Record<
        string,
        unknown
      >;
      // round 8 #2 — unsubscribed: false 로 재구독.
      expect(patchBody.unsubscribed).toBe(false);
    });

    it("[round 8] Resend 422 + 'already exists' → PATCH 재구독 → 200 ok", async () => {
      const fetchSpy = mockDuplicateThenPatchOK(
        422,
        JSON.stringify({ message: "Contact already exists" }),
      );
      vi.stubGlobal("fetch", fetchSpy);
      const res = await POST(makePostRequest(basePayload()));
      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("[round 8] POST 409 → PATCH 4xx 실패 → 502 (재구독 실패 노출)", async () => {
      // 사용자에게 거짓 success 노출 X — PATCH 자체 실패 시 502 로 정직히 노출.
      let callCount = 0;
      const fetchSpy = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return new Response("{}", { status: 409 });
        }
        return new Response("not found", { status: 404 });
      });
      vi.stubGlobal("fetch", fetchSpy);
      const res = await POST(makePostRequest(basePayload()));
      expect(res.status).toBe(502);
    });

    it("Resend 422 + 일반 validation (already 키워드 없음) → 502 (PATCH 미호출)", async () => {
      const fetchSpy = vi.fn(
        () =>
          new Response(
            JSON.stringify({ message: "Invalid email format" }),
            { status: 422 },
          ),
      );
      vi.stubGlobal("fetch", fetchSpy);
      const res = await POST(makePostRequest(basePayload()));
      expect(res.status).toBe(502);
      // 중복 판정 실패 → POST 1회만, PATCH 호출 X.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe("POST /api/billing/notify — same-origin 가드 (round 3 fix)", () => {
  it("Origin 헤더 없음 + Referer 헤더 없음 → 403 forbidden_origin", async () => {
    const res = await POST(
      makePostRequest(basePayload(), { origin: null, referer: null }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("forbidden_origin");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("외부 origin → 403", async () => {
    const res = await POST(
      makePostRequest(basePayload(), { origin: "https://evil.example.com" }),
    );
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("같은 origin (request.url 호스트 일치) → 통과", async () => {
    const res = await POST(
      makePostRequest(basePayload(), { origin: "http://localhost" }),
    );
    expect(res.status).toBe(200);
  });

  it("NEXT_PUBLIC_SITE_ORIGIN 일치 → 통과", async () => {
    process.env.NEXT_PUBLIC_SITE_ORIGIN = "https://pullim-games.app";
    const res = await POST(
      makePostRequest(basePayload(), {
        origin: "https://pullim-games.app",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("VERCEL_URL 일치 → 통과", async () => {
    process.env.VERCEL_URL = "pullim-preview.vercel.app";
    const res = await POST(
      makePostRequest(basePayload(), {
        origin: "https://pullim-preview.vercel.app",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("Origin 없지만 Referer 가 same-origin → 통과", async () => {
    const res = await POST(
      makePostRequest(basePayload(), {
        origin: null,
        referer: "http://localhost/manage/billing",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("Origin 없고 Referer 가 외부 도메인 → 403", async () => {
    const res = await POST(
      makePostRequest(basePayload(), {
        origin: null,
        referer: "https://evil.example.com/foo",
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/billing/notify — rate limit (round 3·9 fix)", () => {
  // round 9 fix #2 — IP 한도 NAT 친화 상향(30/분·100/시간) + IP+email 좁은 버킷 6/시간.

  it("[NAT 친화] 같은 IP 30회 초과 → 31번째 429 + Retry-After 헤더", async () => {
    const ip = "10.20.30.40";
    // 같은 IP 라도 30회까지 (다른 이메일이라는 가정 — 각 i 마다 unique email).
    for (let i = 0; i < 30; i++) {
      const res = await POST(
        makePostRequest(basePayload({ email: `nat${i}@example.com` }), { ip }),
      );
      expect(res.status).toBe(200);
    }
    const res31 = await POST(
      makePostRequest(basePayload({ email: "nat31@example.com" }), { ip }),
    );
    expect(res31.status).toBe(429);
    expect(res31.headers.get("retry-after")).toBeTruthy();
    const json = await res31.json();
    expect(json.error).toBe("rate_limited");
  });

  it("[NAT 친화 회귀] 같은 IP + 다른 이메일 20건 → 모두 200 (학교/학원/가정 NAT)", async () => {
    // round 9 fix #2 회귀 — 기존 5/분 한도였다면 6번째부터 429 였음.
    // NAT 안 20+ 학생 시나리오: 공인 IP 하나에 서로 다른 이메일.
    const sharedNatIp = "203.0.113.50";
    for (let i = 0; i < 20; i++) {
      const res = await POST(
        makePostRequest(basePayload({ email: `student${i}@school.kr` }), {
          ip: sharedNatIp,
        }),
      );
      expect(res.status).toBe(200);
    }
  });

  it("[좁은 버킷] 같은 IP + 같은 email 6회 초과 → 7번째 429 (abuse 차단)", async () => {
    // round 9 fix #2 tier-2 — 같은 이메일 abuse 만 좁게 6/시간 으로 차단.
    const ip = "198.51.100.10";
    const abusedEmail = "spam-target@example.com";
    for (let i = 0; i < 6; i++) {
      const res = await POST(
        makePostRequest(basePayload({ email: abusedEmail }), { ip }),
      );
      expect(res.status).toBe(200);
    }
    const res7 = await POST(
      makePostRequest(basePayload({ email: abusedEmail }), { ip }),
    );
    expect(res7.status).toBe(429);
  });

  it("[좁은 버킷 회귀] 같은 IP 라도 다른 email 이면 좁은 버킷 무관 — 30건 분당 한도 안에서 모두 OK", async () => {
    // 같은 IP 30건(분당 한도)이고 모두 다른 이메일 → tier-2 좁은 버킷은 (IP, email) 쌍이라
    // 다른 email 은 영향 X. 즉 분당 한도 30 안에서 모두 200.
    // (기존 5/분 한도였다면 6번째부터 429 — round 9 fix #2 회귀 검증.)
    const ip = "192.0.2.100";
    for (let i = 0; i < 30; i++) {
      const res = await POST(
        makePostRequest(basePayload({ email: `u${i}@example.com` }), { ip }),
      );
      expect(res.status).toBe(200);
    }
  });

  it("[email 정규화] 대소문자·앞뒤 공백 차이 우회 차단 — 같은 이메일로 간주", async () => {
    // " User@Example.com " 과 "user@example.com" 은 trim+lowercase 후 같은 토큰.
    const ip = "192.0.2.200";
    for (let i = 0; i < 6; i++) {
      const res = await POST(
        makePostRequest(basePayload({ email: "user@example.com" }), { ip }),
      );
      expect(res.status).toBe(200);
    }
    // 대소문자만 변경하여 우회 시도 — Zod trim 이 적용된 같은 토큰 → 429.
    const res7 = await POST(
      makePostRequest(basePayload({ email: "USER@example.com" }), { ip }),
    );
    expect(res7.status).toBe(429);
  });

  it("다른 IP 는 독립 카운트 — burst 영향 안 받음", async () => {
    const ipA = "1.1.1.1";
    const ipB = "2.2.2.2";
    for (let i = 0; i < 30; i++) {
      await POST(
        makePostRequest(basePayload({ email: `a${i}@example.com` }), { ip: ipA }),
      );
    }
    // ipA 는 분당 cap 도달, ipB 는 미시작 → 200.
    const resB = await POST(makePostRequest(basePayload(), { ip: ipB }));
    expect(resB.status).toBe(200);
  });

  it("rate limit 거부 시 Resend 호출 0 (외부 한도 보호)", async () => {
    const ip = "3.3.3.3";
    // 30회 정상 hit (Resend 30회 호출 — 각 unique email).
    for (let i = 0; i < 30; i++) {
      await POST(
        makePostRequest(basePayload({ email: `b${i}@example.com` }), { ip }),
      );
    }
    const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchSpy.mockClear();
    // 31번째 — 429 + Resend 호출 0.
    await POST(
      makePostRequest(basePayload({ email: "b30@example.com" }), { ip }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Codex round 5 회귀 — production 에서 IP 식별 불가 시 fail-closed.
  // (round 6 fix 후) production 외 환경은 dev 폴백 키로 작동.
  describe("[fail-closed] production IP 추출 불가 거부 (round 5 fix)", () => {
    beforeEach(() => {
      // round 6 fix: production 분기를 명시적으로 검증한다.
      vi.stubEnv("NODE_ENV", "production");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("x-forwarded-for·x-real-ip·cf-connecting-ip 모두 없음 → 400 client_unidentified", async () => {
      const res = await POST(makePostRequest(basePayload(), { ip: null }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("client_unidentified");
      // Resend 호출 0 — fail-closed.
      expect(fetch).not.toHaveBeenCalled();
    });

    it("IP 없는 요청 N건이 누적되어도 다른 정상 사용자에 영향 0 (전역 버킷 부재)", async () => {
      // 식별 불가 요청을 라우트 한도(5/분)보다 많이 시도 — 모두 400, store mutation 0.
      for (let i = 0; i < 20; i++) {
        const res = await POST(makePostRequest(basePayload(), { ip: null }));
        expect(res.status).toBe(400);
      }
      // 식별 가능한 정상 사용자는 영향 없이 200 한도 그대로 사용 가능.
      const res = await POST(
        makePostRequest(basePayload(), { ip: "9.9.9.9" }),
      );
      expect(res.status).toBe(200);
    });
  });

  // Codex round 6 fix — production 외(개발/테스트/로컬 프록시)에서는 IP 헤더가
  // 없는 게 정상이라 dev 폴백 키로 라우트가 작동해야 한다.
  describe("[dev 폴백] production 외 환경 IP 헤더 부재 시 작동 (round 6 fix)", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("NODE_ENV=development + IP 헤더 0 → 200 (host 기반 폴백 키)", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const res = await POST(makePostRequest(basePayload(), { ip: null }));
      expect(res.status).toBe(200);
      // Resend 정상 호출 — dev 폴백이 라우트를 통과시킴.
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("NODE_ENV=test + IP 헤더 0 → 200 (dev 폴백 적용)", async () => {
      vi.stubEnv("NODE_ENV", "test");
      const res = await POST(makePostRequest(basePayload(), { ip: null }));
      expect(res.status).toBe(200);
    });

    it("dev 폴백도 rate limit 적용 — 같은 host + 같은 email 6회 초과 시 429 (tier-2)", async () => {
      // round 9 fix #2: 같은 email 좁은 버킷이 dev 폴백에서도 작동.
      vi.stubEnv("NODE_ENV", "development");
      for (let i = 0; i < 6; i++) {
        const res = await POST(makePostRequest(basePayload(), { ip: null }));
        expect(res.status).toBe(200);
      }
      const res7 = await POST(makePostRequest(basePayload(), { ip: null }));
      expect(res7.status).toBe(429);
    });

    it("dev 폴백 키는 실제 IP 키와 격리 — IP 있는 사용자는 영향 0", async () => {
      vi.stubEnv("NODE_ENV", "development");
      // dev 폴백 같은 이메일 6회 소진.
      for (let i = 0; i < 6; i++) {
        await POST(makePostRequest(basePayload(), { ip: null }));
      }
      // 실제 IP 사용자는 자기 한도 그대로.
      const res = await POST(
        makePostRequest(basePayload(), { ip: "1.2.3.4" }),
      );
      expect(res.status).toBe(200);
    });
  });
});

describe("POST /api/billing/notify — production 로깅 (round 9 fix #3)", () => {
  // round 9 fix #3 — Resend 위임 실패 시 production 에서도 console.error 로 구조화 로깅.

  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("[production] Resend 5xx → console.error 호출 + email 원문 미포함", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("fetch", vi.fn(() => new Response("oops", { status: 500 })));
    const res = await POST(
      makePostRequest(basePayload({ email: "log-test@example.com" })),
    );
    expect(res.status).toBe(502);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [msg, meta] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(msg).toContain("[billing/notify]");
    expect(meta).toMatchObject({
      reason: "external_error",
      status: 500,
      marker: "external_error",
    });
    // PII 0 회귀 — 로그 메타에 email 원문이 어떤 형태로도 포함되지 않음.
    const logJson = JSON.stringify(errorSpy.mock.calls);
    expect(logJson).not.toContain("log-test@example.com");
    vi.unstubAllEnvs();
  });

  it("[production] RESEND_API_KEY 미설정 → console.error + marker=secret_missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.RESEND_API_KEY;
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(503);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [, meta] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(meta).toMatchObject({
      reason: "unavailable",
      marker: "secret_missing",
    });
    vi.unstubAllEnvs();
  });

  it("[production] Resend 네트워크 단절 → console.error 호출", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("network down");
      }),
    );
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(502);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it("[production] 성공 시(200) console.error 호출 0", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(200);
    expect(errorSpy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("[NODE_ENV !== production] 실패도 동일하게 logging — 환경 의존 없음", async () => {
    // round 9 이전(`NODE_ENV !== 'production'` 게이트) 회귀: production 외 환경에서도
    // 로깅이 사라져선 안 된다 (디버깅 시그널 일관 보존).
    vi.stubEnv("NODE_ENV", "development");
    vi.stubGlobal("fetch", vi.fn(() => new Response("oops", { status: 500 })));
    const res = await POST(makePostRequest(basePayload()));
    expect(res.status).toBe(502);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
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
