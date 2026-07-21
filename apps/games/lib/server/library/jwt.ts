import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

import type { LaunchToken, LaunchTokenPayload } from "@/lib/library";
import type { LaunchTokenVerifier } from "@/lib/library/runtime";

const JwtHeaderSchema = z
  .object({
    alg: z.literal("HS256"),
    typ: z.literal("JWT").optional(),
    kid: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MIN_SECRET_BYTES = 32;
const MAX_TOKEN_BYTES = 16 * 1024;

function decodeJsonSegment(segment: string): unknown {
  if (!segment || !BASE64URL.test(segment)) {
    throw new Error("invalid_base64url");
  }
  const decoded = Buffer.from(segment, "base64url").toString("utf8");
  return JSON.parse(decoded) as unknown;
}

export function createHmacLaunchTokenVerifier(
  secret: string,
): LaunchTokenVerifier {
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) {
    throw new Error(
      `PULLIM_LIBRARY_LAUNCH_SECRET는 최소 ${MIN_SECRET_BYTES} bytes여야 합니다.`,
    );
  }

  return {
    async verify(token: LaunchToken): Promise<unknown> {
      if (Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) {
        throw new Error("token_too_large");
      }
      const segments = token.split(".");
      if (segments.length !== 3) throw new Error("invalid_compact_token");
      const [encodedHeader, encodedPayload, encodedSignature] = segments;
      JwtHeaderSchema.parse(decodeJsonSegment(encodedHeader!));
      if (!encodedSignature || !BASE64URL.test(encodedSignature)) {
        throw new Error("invalid_signature_encoding");
      }

      const expected = createHmac("sha256", secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest();
      const actual = Buffer.from(encodedSignature, "base64url");
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      ) {
        throw new Error("invalid_signature");
      }
      return decodeJsonSegment(encodedPayload!);
    },
  };
}

/** 테스트·Library producer fixture용. production 발급기는 Library 서비스가 소유한다. */
export function signLaunchTokenForTests(
  payload: LaunchTokenPayload,
  secret: string,
): LaunchToken {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}
