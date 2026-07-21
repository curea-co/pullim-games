import { describe, expect, it } from "vitest";

import type {
  CurriculumDatasetRef,
  GameBindingRef,
  GameTemplateRef,
} from "@/lib/library";
import { LibraryRuntimeError } from "@/lib/library/runtime";
import {
  createHandoffArtifactResolver,
  libraryLaunchLocation,
  parseLibraryHandoffRequest,
} from "./handoff";
import { computeArtifactIntegrity } from "./integrity";

const artifacts = {
  binding: { kind: "game-binding", id: "b", version: "1.0.0" },
  template: { kind: "game-template", id: "t", version: "1.0.0" },
  curriculum: {
    kind: "curriculum-dataset",
    id: "d",
    version: "1.0.0",
    items: [],
  },
};

describe("Library POST handoff parser/resolver", () => {
  it("JSON body를 token/artifact bundle로 파싱", async () => {
    const request = new Request("http://localhost/api/library/launch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "signed.token.value", artifacts }),
    });
    await expect(parseLibraryHandoffRequest(request)).resolves.toEqual({
      token: "signed.token.value",
      artifacts,
    });
  });

  it("top-level form용 urlencoded body도 같은 계약으로 파싱", async () => {
    const form = new URLSearchParams({
      token: "signed.token.value",
      binding: JSON.stringify(artifacts.binding),
      template: JSON.stringify(artifacts.template),
      curriculum: JSON.stringify(artifacts.curriculum),
    });
    const request = new Request("http://localhost/api/library/launch", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    await expect(parseLibraryHandoffRequest(request)).resolves.toEqual({
      token: "signed.token.value",
      artifacts,
    });
  });

  it("resolver가 POST 본문의 canonical SHA-256을 직접 계산", async () => {
    const resolver = createHandoffArtifactResolver(artifacts);
    const bindingRef: GameBindingRef = {
      kind: "game-binding",
      id: "b",
      version: "1.0.0",
      integrity: computeArtifactIntegrity(artifacts.binding),
    };
    await expect(resolver.resolveBinding(bindingRef)).resolves.toEqual({
      value: artifacts.binding,
      integrity: bindingRef.integrity,
    });
  });

  it("integrity가 없는 ref는 handoff에서 fail closed", async () => {
    const resolver = createHandoffArtifactResolver(artifacts);
    const templateRef: GameTemplateRef = {
      kind: "game-template",
      id: "t",
      version: "1.0.0",
    };
    const curriculumRef: CurriculumDatasetRef = {
      kind: "curriculum-dataset",
      id: "d",
      version: "1.0.0",
    };
    await expect(resolver.resolveTemplate(templateRef)).rejects.toBeInstanceOf(
      LibraryRuntimeError,
    );
    await expect(
      resolver.resolveCurriculum(curriculumRef),
    ).rejects.toBeInstanceOf(LibraryRuntimeError);
  });

  it("검증된 activity를 library marker/mode URL로 변환", () => {
    expect(
      libraryLaunchLocation({
        activity: { gameId: "math-quick-quiz", mode: "deep-recall" },
      }),
    ).toBe("/games/math-quick-quiz?library=1&mode=deep-recall");
  });
});
