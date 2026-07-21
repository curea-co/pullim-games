import { describe, expect, it, vi } from "vitest";

import { QuickQuizCardSchema } from "@/games/math-quick-quiz/schema";
import { cards as quickQuizCards } from "@/games/math-quick-quiz/content";
import { games } from "@/lib/games/registry";

import {
  createRegisteredCurriculumDatasetSchema,
  gameTemplateFromManifest,
  pinGameActivity,
  RegisteredGameBindingSchema,
} from "../registry-validation";
import type { LaunchTokenPayload } from "../types";
import { LibraryRuntimeError } from "./errors";
import {
  resolveGameRouteLaunch,
  resolveLibraryLaunch,
  type LaunchRuntimeDependencies,
} from "./launch";

const NOW_SECONDS = 1_784_560_050;
const DatasetSchema = createRegisteredCurriculumDatasetSchema(
  QuickQuizCardSchema,
);

function createFixture() {
  const manifest = games.find((game) => game.meta.id === "math-quick-quiz");
  if (!manifest) throw new Error("fixture manifest missing");

  const template = gameTemplateFromManifest(manifest, {
    version: "1.0.0",
    protocolVersion: "1.0.0",
    curriculumSlots: [{ id: "cards", required: true }],
  });
  const curriculum = DatasetSchema.parse({
    kind: "curriculum-dataset",
    schemaVersion: "1.0",
    id: "math-quick-quiz-cards",
    version: "2026.07.1",
    title: "수학 빠른 퀴즈",
    locale: "ko-KR",
    scope: { kind: "registered-game", gameId: "math-quick-quiz" },
    items: quickQuizCards,
  });
  const binding = RegisteredGameBindingSchema.parse({
    kind: "game-binding",
    schemaVersion: "1.0",
    id: "math-quick-quiz-default",
    version: "1.0.0",
    gameId: "math-quick-quiz",
    mode: "default",
    template: {
      kind: "game-template",
      id: template.id,
      version: template.version,
      integrity: "sha256-template",
    },
    curriculum: {
      kind: "curriculum-dataset",
      id: curriculum.id,
      version: curriculum.version,
      integrity: "sha256-curriculum",
    },
    slots: [{ slotId: "cards", selection: { strategy: "adaptive" } }],
  });
  const activity = pinGameActivity(binding);
  const payload: LaunchTokenPayload = {
    tokenVersion: "1.0",
    iss: "pullim-library",
    aud: "pullim-games",
    sub: "anon_01",
    jti: "launch_01",
    iat: NOW_SECONDS - 50,
    exp: NOW_SECONDS + 250,
    anonymousUserId: "anon_01",
    sessionId: "session_01",
    activity,
  };
  const verifier = { verify: vi.fn().mockResolvedValue(payload) };
  const artifacts = {
    resolveBinding: vi.fn().mockResolvedValue({
      value: binding,
      integrity: undefined,
    }),
    resolveTemplate: vi.fn().mockResolvedValue({
      value: template,
      integrity: "sha256-template",
    }),
    resolveCurriculum: vi.fn().mockResolvedValue({
      value: curriculum,
      integrity: "sha256-curriculum",
    }),
  };
  const dependencies: LaunchRuntimeDependencies<
    (typeof quickQuizCards)[number]
  > = {
    verifier,
    artifacts,
    policy: {
      issuer: "pullim-library",
      audience: "pullim-games",
      maxTokenLifetimeSeconds: 300,
      now: () => NOW_SECONDS * 1_000,
    },
    parseCurriculumDataset: (input) => DatasetSchema.parse(input),
  };

  return { artifacts, binding, curriculum, dependencies, payload, template, verifier };
}

async function expectRuntimeCode(
  promise: Promise<unknown>,
  code: LibraryRuntimeError["code"],
) {
  await expect(promise).rejects.toMatchObject({
    name: "LibraryRuntimeError",
    code,
  });
}

describe("Library launch runtime", () => {
  it("암호 검증 뒤 정확한 binding/template/dataset 버전을 병렬 해석", async () => {
    const fixture = createFixture();
    const launch = await resolveLibraryLaunch(
      "signed.compact.token",
      fixture.dependencies,
    );

    expect(fixture.verifier.verify).toHaveBeenCalledWith(
      "signed.compact.token",
    );
    expect(fixture.artifacts.resolveBinding).toHaveBeenCalledWith(
      fixture.payload.activity.binding,
    );
    expect(launch).toMatchObject({
      source: "library",
      binding: { id: fixture.binding.id, version: fixture.binding.version },
      template: { id: fixture.template.id, version: fixture.template.version },
      curriculum: {
        id: fixture.curriculum.id,
        version: fixture.curriculum.version,
      },
    });
  });

  it("서명 검증 실패와 만료/수명 초과를 서로 다른 오류로 거부", async () => {
    const verification = createFixture();
    verification.verifier.verify.mockRejectedValueOnce(new Error("bad sig"));
    await expectRuntimeCode(
      resolveLibraryLaunch("bad", verification.dependencies),
      "token_verification_failed",
    );

    const expired = createFixture();
    expired.verifier.verify.mockResolvedValueOnce({
      ...expired.payload,
      exp: NOW_SECONDS,
    });
    await expectRuntimeCode(
      resolveLibraryLaunch("expired", expired.dependencies),
      "token_expired",
    );

    const tooLong = createFixture();
    tooLong.verifier.verify.mockResolvedValueOnce({
      ...tooLong.payload,
      iat: NOW_SECONDS - 60,
      exp: NOW_SECONDS + 300,
    });
    await expectRuntimeCode(
      resolveLibraryLaunch("too-long", tooLong.dependencies),
      "token_lifetime_exceeded",
    );
  });

  it("issuer/audience와 artifact integrity·필수 slot drift를 거부", async () => {
    const wrongAudience = createFixture();
    wrongAudience.verifier.verify.mockResolvedValueOnce({
      ...wrongAudience.payload,
      aud: "somewhere-else",
    });
    await expectRuntimeCode(
      resolveLibraryLaunch("wrong-aud", wrongAudience.dependencies),
      "audience_mismatch",
    );

    const integrity = createFixture();
    integrity.artifacts.resolveTemplate.mockResolvedValueOnce({
      value: integrity.template,
      integrity: "sha256-different",
    });
    await expectRuntimeCode(
      resolveLibraryLaunch("integrity", integrity.dependencies),
      "artifact_mismatch",
    );

    const missingSlot = createFixture();
    missingSlot.artifacts.resolveBinding.mockResolvedValueOnce({
      value: { ...missingSlot.binding, slots: [] },
    });
    await expectRuntimeCode(
      resolveLibraryLaunch("slot", missingSlot.dependencies),
      "artifact_mismatch",
    );
  });

  it("직접 route는 기존 mode 정규화를 유지하고 verifier를 요구하지 않음", async () => {
    await expect(
      resolveGameRouteLaunch({
        gameId: "factorization",
        requestedMode: "time-attack",
      }),
    ).resolves.toEqual({
      source: "direct",
      gameId: "factorization",
      mode: "default",
    });
  });

  it("Library route에서 URL gameId/mode가 서명 activity를 덮어쓰지 못함", async () => {
    const route = createFixture();
    await expectRuntimeCode(
      resolveGameRouteLaunch(
        { gameId: "factorization", token: "signed.compact.token" },
        route.dependencies,
      ),
      "launch_route_mismatch",
    );

    const mode = createFixture();
    await expectRuntimeCode(
      resolveGameRouteLaunch(
        {
          gameId: "math-quick-quiz",
          requestedMode: "deep-recall",
          token: "signed.compact.token",
        },
        mode.dependencies,
      ),
      "launch_mode_mismatch",
    );
  });
});
