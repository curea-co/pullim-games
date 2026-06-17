// /api/event 라우트 동작 검증.

import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/event", () => {
  it("유효 페이로드 → 200 ok", async () => {
    const res = await POST(
      makePostRequest({
        fingerprint: "fp-123",
        gameId: "factorization",
        cardId: "card-001",
        action: "submit",
        timestampMs: Date.now(),
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

  it("zod 검증 실패 → 422", async () => {
    const res = await POST(
      makePostRequest({
        fingerprint: "", // min(1) 위반
        gameId: "factorization",
        cardId: null,
        action: "submit",
        timestampMs: 100,
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("schema_validation_failed");
  });

  it("필수 필드 누락 → 422", async () => {
    const res = await POST(
      makePostRequest({
        fingerprint: "fp-123",
        // gameId 누락
        action: "submit",
        timestampMs: 100,
      }),
    );
    expect(res.status).toBe(422);
  });

  it("unknown action → 422", async () => {
    const res = await POST(
      makePostRequest({
        fingerprint: "fp-123",
        gameId: "factorization",
        cardId: null,
        action: "fake-action",
        timestampMs: 100,
      }),
    );
    expect(res.status).toBe(422);
  });

  it("session-start 는 cardId null OK", async () => {
    const res = await POST(
      makePostRequest({
        fingerprint: "fp-123",
        gameId: "factorization",
        cardId: null,
        action: "session-start",
        timestampMs: Date.now(),
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("GET /api/event", () => {
  it("405 method not allowed", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
