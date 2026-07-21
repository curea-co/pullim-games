import "server-only";

import { createHash } from "node:crypto";

function canonicalJson(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non_finite_number");
    return JSON.stringify(value);
  }
  if (typeof value !== "object") throw new Error("non_json_value");
  if (seen.has(value)) throw new Error("cyclic_value");

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => canonicalJson(item, seen)).join(",")}]`;
    }
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(record[key], seen)}`,
      );
    return `{${entries.join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

export function canonicalizeArtifact(value: unknown): string {
  return canonicalJson(value, new Set());
}

/** RFC 8941 SRI 관례와 같은 `sha256-<base64>` 형태. */
export function computeArtifactIntegrity(value: unknown): string {
  return `sha256-${createHash("sha256")
    .update(canonicalizeArtifact(value))
    .digest("base64")}`;
}
