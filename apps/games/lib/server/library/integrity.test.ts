import { describe, expect, it } from "vitest";

import {
  canonicalizeArtifact,
  computeArtifactIntegrity,
} from "./integrity";

describe("Library artifact canonical integrity", () => {
  it("object key 순서와 무관한 canonical JSON/hash 생성", () => {
    const left = { z: 1, nested: { b: true, a: "x" } };
    const right = { nested: { a: "x", b: true }, z: 1 };
    expect(canonicalizeArtifact(left)).toBe(canonicalizeArtifact(right));
    expect(computeArtifactIntegrity(left)).toBe(
      computeArtifactIntegrity(right),
    );
    expect(computeArtifactIntegrity(left)).toMatch(/^sha256-/);
  });

  it("array 순서는 integrity에 반영", () => {
    expect(computeArtifactIntegrity([1, 2])).not.toBe(
      computeArtifactIntegrity([2, 1]),
    );
  });

  it("JSON이 아닌 값과 cycle을 거부", () => {
    expect(() => canonicalizeArtifact(undefined)).toThrow("non_json_value");
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalizeArtifact(cyclic)).toThrow("cyclic_value");
  });
});
