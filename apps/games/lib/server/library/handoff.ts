import "server-only";

import { z } from "zod";

import {
  resolveLibraryLaunch,
  type LibraryArtifactResolver,
} from "@/lib/library/runtime";
import type { LaunchToken } from "@/lib/library";
import { LibraryRuntimeError } from "@/lib/library/runtime";
import { computeArtifactIntegrity } from "./integrity";
import { getLibraryLaunchSecurityConfig } from "./config";

export const MAX_LIBRARY_HANDOFF_BYTES = 8 * 1024 * 1024;

const JsonHandoffSchema = z
  .object({
    token: z.string().trim().min(1).max(16 * 1024),
    artifacts: z
      .object({
        binding: z.unknown(),
        template: z.unknown(),
        curriculum: z.unknown(),
      })
      .strict(),
  })
  .strict();

export type ParsedLibraryHandoff = z.infer<typeof JsonHandoffSchema>;

function parseFormArtifact(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") throw new Error("missing_form_artifact");
  return JSON.parse(value) as unknown;
}

export async function parseLibraryHandoffRequest(
  request: Request,
): Promise<ParsedLibraryHandoff> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_LIBRARY_HANDOFF_BYTES
  ) {
    throw new LibraryRuntimeError(
      "artifact_invalid",
      "Library handoff payload가 너무 큽니다.",
    );
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_LIBRARY_HANDOFF_BYTES) {
    throw new LibraryRuntimeError(
      "artifact_invalid",
      "Library handoff payload가 너무 큽니다.",
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let input: unknown;
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = new URLSearchParams(raw);
      input = {
        token: form.get("token"),
        artifacts: {
          binding: parseFormArtifact(form.get("binding")),
          template: parseFormArtifact(form.get("template")),
          curriculum: parseFormArtifact(form.get("curriculum")),
        },
      };
    } else if (contentType.includes("application/json")) {
      input = JSON.parse(raw) as unknown;
    } else {
      throw new Error("unsupported_content_type");
    }
  } catch {
    throw new LibraryRuntimeError(
      "artifact_invalid",
      "Library handoff body를 해석할 수 없습니다.",
    );
  }

  const parsed = JsonHandoffSchema.safeParse(input);
  if (!parsed.success) {
    throw new LibraryRuntimeError(
      "artifact_invalid",
      "Library handoff body 계약이 유효하지 않습니다.",
    );
  }
  return parsed.data;
}

function requirePinnedIntegrity(integrity: string | undefined): void {
  if (!integrity || !/^sha256-[A-Za-z0-9+/]+={0,2}$/.test(integrity)) {
    throw new LibraryRuntimeError(
      "artifact_mismatch",
      "POST handoff artifact에는 sha256 integrity 고정이 필요합니다.",
    );
  }
}

export function createHandoffArtifactResolver(
  artifacts: ParsedLibraryHandoff["artifacts"],
): LibraryArtifactResolver {
  return {
    async resolveBinding(ref) {
      requirePinnedIntegrity(ref.integrity);
      return {
        value: artifacts.binding,
        integrity: computeArtifactIntegrity(artifacts.binding),
      };
    },
    async resolveTemplate(ref) {
      requirePinnedIntegrity(ref.integrity);
      return {
        value: artifacts.template,
        integrity: computeArtifactIntegrity(artifacts.template),
      };
    },
    async resolveCurriculum(ref) {
      requirePinnedIntegrity(ref.integrity);
      return {
        value: artifacts.curriculum,
        integrity: computeArtifactIntegrity(artifacts.curriculum),
      };
    },
  };
}

export async function validateLibraryHandoff(
  handoff: ParsedLibraryHandoff,
) {
  const security = getLibraryLaunchSecurityConfig();
  return resolveLibraryLaunch(handoff.token as LaunchToken, {
    ...security,
    artifacts: createHandoffArtifactResolver(handoff.artifacts),
  });
}

export function libraryLaunchLocation(
  payload: {
    readonly activity: { readonly gameId: string; readonly mode: string };
  },
): string {
  const query = new URLSearchParams({ library: "1" });
  if (payload.activity.mode !== "default") {
    query.set("mode", payload.activity.mode);
  }
  return `/games/${encodeURIComponent(payload.activity.gameId)}?${query}`;
}
