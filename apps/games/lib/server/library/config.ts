import "server-only";

import type { LaunchValidationPolicy } from "@/lib/library/runtime";
import { createHmacLaunchTokenVerifier } from "./jwt";

const DEFAULT_MAX_TOKEN_SECONDS = 300;
const MAX_CONFIGURED_TOKEN_SECONDS = 15 * 60;

function parseMaxTokenSeconds(raw: string | undefined): number {
  if (!raw) return DEFAULT_MAX_TOKEN_SECONDS;
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `PULLIM_LIBRARY_LAUNCH_MAX_AGE_SECONDS는 1~${MAX_CONFIGURED_TOKEN_SECONDS} 정수여야 합니다.`,
    );
  }
  const parsed = Number.parseInt(raw, 10);
  if (
    !Number.isInteger(parsed) ||
    parsed <= 0 ||
    parsed > MAX_CONFIGURED_TOKEN_SECONDS
  ) {
    throw new Error(
      `PULLIM_LIBRARY_LAUNCH_MAX_AGE_SECONDS는 1~${MAX_CONFIGURED_TOKEN_SECONDS} 정수여야 합니다.`,
    );
  }
  return parsed;
}

export function getLibraryLaunchSecurityConfig(): {
  verifier: ReturnType<typeof createHmacLaunchTokenVerifier>;
  policy: LaunchValidationPolicy;
} {
  const secret = process.env.PULLIM_LIBRARY_LAUNCH_SECRET;
  if (!secret) throw new Error("PULLIM_LIBRARY_LAUNCH_SECRET 미설정");

  return {
    verifier: createHmacLaunchTokenVerifier(secret),
    policy: {
      issuer: process.env.PULLIM_LIBRARY_LAUNCH_ISSUER ?? "pullim-library",
      audience:
        process.env.PULLIM_LIBRARY_LAUNCH_AUDIENCE ?? "pullim-games",
      maxTokenLifetimeSeconds: parseMaxTokenSeconds(
        process.env.PULLIM_LIBRARY_LAUNCH_MAX_AGE_SECONDS,
      ),
      clockToleranceSeconds: 5,
    },
  };
}

export function isAllowedLibraryHandoffOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // server-to-server 또는 비브라우저 producer

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }
  if (origin === requestOrigin) return true;

  const allowed = new Set(
    (process.env.PULLIM_LIBRARY_ORIGINS ?? "")
      .split(",")
      .map((item) => item.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );
  return allowed.has(origin.replace(/\/$/, ""));
}
