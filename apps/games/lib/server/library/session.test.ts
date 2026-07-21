import { describe, expect, it, vi } from "vitest";

import type { LaunchTokenPayload } from "@/lib/library";
import type { QueryFn } from "@/lib/server/db/client";
import {
  buildLibraryLaunchCookie,
  createLibraryLaunchSession,
  getLibraryLaunchSession,
  readLibraryLaunchToken,
} from "./session";

const NOW = 1_784_560_000_000;

function payload(): LaunchTokenPayload {
  return {
    tokenVersion: "1.0",
    iss: "pullim-library",
    aud: "pullim-games",
    sub: "anon_01",
    jti: "launch_01",
    iat: NOW / 1_000,
    exp: NOW / 1_000 + 300,
    anonymousUserId: "anon_01",
    sessionId: "session_01",
    activity: {
      binding: { kind: "game-binding", id: "b", version: "1.0.0" },
      template: {
        kind: "game-template",
        id: "math-quick-quiz",
        version: "1.0.0",
      },
      curriculum: {
        kind: "curriculum-dataset",
        id: "d",
        version: "1.0.0",
      },
      gameId: "math-quick-quiz",
      mode: "default",
    },
  };
}

describe("opaque Library launch session", () => {
  it("DB에는 token hash와 payload만 저장하고 짧은 HttpOnly cookie 발급", async () => {
    const exec = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const session = await createLibraryLaunchSession(
      payload(),
      exec as QueryFn,
      NOW,
    );

    expect(session.token).toMatch(/^[0-9a-f]{64}$/);
    const insertParams = exec.mock.calls[0]![1] as unknown[];
    expect(insertParams[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(insertParams[0]).not.toBe(session.token);
    expect(JSON.parse(insertParams[1] as string)).toEqual({
      launchId: "launch_01",
      iat: NOW / 1_000,
      exp: NOW / 1_000 + 300,
      anonymousUserId: "anon_01",
      sessionId: "session_01",
      activity: payload().activity,
    });

    const cookie = buildLibraryLaunchCookie(
      session.token,
      session.expiresAt,
      NOW,
    );
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(readLibraryLaunchToken(cookie)).toBe(session.token);
  });

  it("유효 session row를 payload로 복원", async () => {
    const exec = vi.fn().mockResolvedValue({
      rows: [
        {
          token_hash: "h",
          launch_payload: {
            launchId: "launch_01",
            iat: NOW / 1_000,
            exp: NOW / 1_000 + 300,
            anonymousUserId: "anon_01",
            sessionId: "session_01",
            activity: payload().activity,
          },
          created_at: NOW,
          expires_at: NOW + 300_000,
        },
      ],
      rowCount: 1,
    });
    await expect(
      getLibraryLaunchSession("a".repeat(64), exec as QueryFn, NOW),
    ).resolves.toEqual({
      launchId: "launch_01",
      iat: NOW / 1_000,
      exp: NOW / 1_000 + 300,
      anonymousUserId: "anon_01",
      sessionId: "session_01",
      activity: payload().activity,
    });
  });

  it("만료 row는 삭제하고 null 반환", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            token_hash: "h",
            launch_payload: payload(),
            created_at: NOW - 500_000,
            expires_at: NOW,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(
      getLibraryLaunchSession("a".repeat(64), exec as QueryFn, NOW),
    ).resolves.toBeNull();
    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec.mock.calls[1]![0]).toContain("DELETE");
  });
});
