import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { LaunchTokenPayload } from "@/lib/library";
import {
  createHmacLaunchTokenVerifier,
  signLaunchTokenForTests,
} from "./jwt";

const SECRET = "0123456789abcdef0123456789abcdef";

function payload(): LaunchTokenPayload {
  return {
    tokenVersion: "1.0",
    iss: "pullim-library",
    aud: "pullim-games",
    sub: "anon_01",
    jti: "launch_01",
    iat: 1_784_560_000,
    exp: 1_784_560_300,
    anonymousUserId: "anon_01",
    sessionId: "session_01",
    activity: {
      binding: {
        kind: "game-binding",
        id: "binding-01",
        version: "1.0.0",
      },
      template: {
        kind: "game-template",
        id: "math-quick-quiz",
        version: "1.0.0",
      },
      curriculum: {
        kind: "curriculum-dataset",
        id: "cards-01",
        version: "1.0.0",
      },
      gameId: "math-quick-quiz",
      mode: "default",
    },
  };
}

describe("HS256 Library launch verifier", () => {
  it("정상 compact token의 서명을 검증하고 payload 반환", async () => {
    const token = signLaunchTokenForTests(payload(), SECRET);
    await expect(
      createHmacLaunchTokenVerifier(SECRET).verify(token),
    ).resolves.toEqual(payload());
  });

  it("다른 secret 서명과 alg=none을 거부", async () => {
    const token = signLaunchTokenForTests(
      payload(),
      "abcdef0123456789abcdef0123456789",
    );
    await expect(
      createHmacLaunchTokenVerifier(SECRET).verify(token),
    ).rejects.toThrow("invalid_signature");

    const header = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload())).toString("base64url");
    const signature = createHmac("sha256", SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    await expect(
      createHmacLaunchTokenVerifier(SECRET).verify(
        `${header}.${body}.${signature}`,
      ),
    ).rejects.toThrow();
  });

  it("32 bytes 미만 secret 구성을 즉시 거부", () => {
    expect(() => createHmacLaunchTokenVerifier("too-short")).toThrow(
      "최소 32 bytes",
    );
  });
});
