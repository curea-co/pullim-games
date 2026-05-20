// /api/billing/notify 라우트 동작 검증.
// SPEC §05.6 알림 신청 + §05.7 결제·구독.

import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/billing/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const SAMPLE_HASH =
  "a".repeat(64); // 유효한 hex 64자 (sha256 길이) — 실제 hash 검증은 email-hash.test.ts 참조.

describe("POST /api/billing/notify", () => {
  it("유효 페이로드 → 200 ok", async () => {
    const res = await POST(
      makePostRequest({
        action: "billing.notify.signup",
        emailHash: SAMPLE_HASH,
        ts: Date.now(),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("invalid JSON → 400", async () => {
    const res = await POST(makePostRequest("not-json{"));
    expect(res.status).toBe(400);
  });

  it("emailHash 누락 → 422", async () => {
    const res = await POST(
      makePostRequest({
        action: "billing.notify.signup",
        ts: Date.now(),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("schema_validation_failed");
  });

  it("emailHash 형식 불일치 (대문자 hex) → 422", async () => {
    const res = await POST(
      makePostRequest({
        action: "billing.notify.signup",
        emailHash: "A".repeat(64),
        ts: Date.now(),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("emailHash 형식 불일치 (길이 부족) → 422", async () => {
    const res = await POST(
      makePostRequest({
        action: "billing.notify.signup",
        emailHash: "a".repeat(32),
        ts: Date.now(),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("이메일 원문이 들어와도 거부 (plain email 필드는 스키마에 없음 — strict 거부 아님이나 hash 검증으로 차단)", async () => {
    // 클라이언트 실수로 plain email 을 emailHash 로 보내는 케이스
    const res = await POST(
      makePostRequest({
        action: "billing.notify.signup",
        emailHash: "user@example.com",
        ts: Date.now(),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("action 누락 → 422", async () => {
    const res = await POST(
      makePostRequest({
        emailHash: SAMPLE_HASH,
        ts: Date.now(),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("ts 음수 → 422", async () => {
    const res = await POST(
      makePostRequest({
        action: "billing.notify.signup",
        emailHash: SAMPLE_HASH,
        ts: -1,
      }),
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/billing/notify", () => {
  it("405 method not allowed", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
