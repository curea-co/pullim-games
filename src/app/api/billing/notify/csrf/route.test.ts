// /api/billing/notify/csrf — round 10 fix #1 토큰 발급 라우트 동작 검증.
//
// 검증 항목:
//   - GET 응답 200 + Set-Cookie 헤더가 SameSite=Strict + HttpOnly + Path 정합
//   - 발급된 토큰이 store 에 등록되어 POST 라우트에서 verify 통과
//   - 호출마다 새 토큰 발급 (1회 소비 정책과 정합)
//   - POST 메소드 405

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import {
  BILLING_NOTIFY_CSRF_COOKIE,
  resetBillingNotifyCsrfStoreForTests,
  verifyBillingNotifyCsrfToken,
} from "@/lib/server/billing/csrf";

beforeEach(() => {
  resetBillingNotifyCsrfStoreForTests();
});

afterEach(() => {
  resetBillingNotifyCsrfStoreForTests();
  vi.unstubAllEnvs();
});

describe("GET /api/billing/notify/csrf — round 10 토큰 발급", () => {
  it("200 + Set-Cookie 헤더에 SameSite=Strict + HttpOnly + Path 부착", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(`${BILLING_NOTIFY_CSRF_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Path=/api/billing/notify");
    expect(setCookie).toContain("Max-Age=3600");
  });

  it("[production] Secure 플래그 동봉", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET();
    expect(res.headers.get("set-cookie")).toContain("Secure");
  });

  it("[development] Secure 플래그 미동봉 (HTTP localhost 허용)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await GET();
    expect(res.headers.get("set-cookie")).not.toContain("Secure");
  });

  it("응답 body 는 토큰 자체를 노출하지 않음 — 쿠키로만 전달", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("cache-control: no-store — 매 요청 fresh 토큰", async () => {
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("발급된 토큰이 store 에 등록 — verify 통과", async () => {
    const res = await GET();
    const setCookie = res.headers.get("set-cookie")!;
    const match = setCookie.match(
      new RegExp(`${BILLING_NOTIFY_CSRF_COOKIE}=([0-9a-f]+)`),
    );
    expect(match).toBeTruthy();
    const token = match![1];
    expect(verifyBillingNotifyCsrfToken(token, { consume: false })).toBe("valid");
  });

  it("두 번 호출 시 각각 다른 토큰 발급 (replay 차단 정합)", async () => {
    const res1 = await GET();
    const res2 = await GET();
    const t1 = res1.headers.get("set-cookie")!.match(
      new RegExp(`${BILLING_NOTIFY_CSRF_COOKIE}=([0-9a-f]+)`),
    )![1];
    const t2 = res2.headers.get("set-cookie")!.match(
      new RegExp(`${BILLING_NOTIFY_CSRF_COOKIE}=([0-9a-f]+)`),
    )![1];
    expect(t1).not.toBe(t2);
  });
});

describe("POST /api/billing/notify/csrf", () => {
  it("405 — 토큰 발급은 GET 전용", async () => {
    const res = await POST();
    expect(res.status).toBe(405);
  });
});
