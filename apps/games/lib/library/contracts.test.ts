import { describe, expect, it } from "vitest";

import type { GameMode } from "@/lib/core";
import { QuickQuizCardSchema } from "@/games/math-quick-quiz/schema";
import { cards as quickQuizCards } from "@/games/math-quick-quiz/content";
import { games } from "@/lib/games/registry";
import type { GameMeta } from "@/lib/games/types";

import {
  createLearningEventSchema,
  createRegisteredCurriculumDatasetSchema,
  gameTemplateFromManifest,
  GAME_MODES,
  LaunchTokenPayloadSchema,
  LearningEventSchema,
  PinnedVersionSchema,
  pinGameActivity,
  RegisteredGameBindingSchema,
  RegisteredGameTemplateSchema,
  REUSABLE_MECHANISM_COMPONENTS,
} from ".";
import type {
  GameActivity,
  GameBinding,
  LaunchTokenClaims,
  LaunchTokenPayload,
  ReusableMechanismComponent,
} from ".";

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() =>
    T extends TRight ? 1 : 2
    ? true
    : false;
type Assert<TValue extends true> = TValue;

type GameActivityCompatibility = Assert<Equal<GameActivity, GameBinding>>;
type LaunchClaimsCompatibility = Assert<
  Equal<LaunchTokenClaims, LaunchTokenPayload>
>;
type ModeSourceCompatibility = Assert<
  Equal<(typeof GAME_MODES)[number], GameMode>
>;
type MechanismSourceCompatibility = Assert<
  Equal<
    (typeof REUSABLE_MECHANISM_COMPONENTS)[number],
    ReusableMechanismComponent
  >
>;
type GameMetaMechanismCompatibility = Assert<
  Equal<
    ReusableMechanismComponent,
    NonNullable<GameMeta["mechanismComponent"]>
  >
>;

const compatibilityChecks: [
  GameActivityCompatibility,
  LaunchClaimsCompatibility,
  ModeSourceCompatibility,
  MechanismSourceCompatibility,
  GameMetaMechanismCompatibility,
] = [true, true, true, true, true];

const templateRef = {
  kind: "game-template" as const,
  id: "math-quick-quiz",
  version: "1.0.0",
};
const curriculumRef = {
  kind: "curriculum-dataset" as const,
  id: "math-quick-quiz-cards",
  version: "2026.07.1",
};

const bindingInput = {
  kind: "game-binding",
  schemaVersion: "1.0",
  id: "math-quick-quiz-default",
  version: "1.0.0",
  gameId: "math-quick-quiz",
  mode: "default",
  template: templateRef,
  curriculum: curriculumRef,
  slots: [{ slotId: "cards", selection: { strategy: "adaptive" } }],
};

describe("Library 계약 — registry/FSRS 정합", () => {
  it("기존 별칭과 registry/FSRS 정본 타입을 그대로 재사용한다", () => {
    expect(compatibilityChecks).toEqual([true, true, true, true, true]);
  });

  it("registry의 모든 게임을 별도 메타 복제 없이 GameTemplate으로 투영한다", () => {
    expect(games).toHaveLength(21);

    for (const manifest of games) {
      const template = gameTemplateFromManifest(manifest, {
        version: "1.0.0",
        protocolVersion: "1.0.0",
        curriculumSlots: [{ id: "cards", required: true }],
      });
      expect(RegisteredGameTemplateSchema.safeParse(template).success).toBe(
        true,
      );
    }
  });

  it("4개 메커니즘 정본과 registry 선언 불일치를 거부한다", () => {
    expect(new Set(REUSABLE_MECHANISM_COMPONENTS).size).toBe(4);
    const manifest = games.find(
      (game) => game.meta.mechanismComponent === "QuickQuiz",
    );
    expect(manifest).toBeDefined();
    if (!manifest) return;

    const template = gameTemplateFromManifest(manifest, {
      version: "1.0.0",
      protocolVersion: "1.0.0",
      curriculumSlots: [{ id: "cards" }],
    });
    const mismatched = {
      ...template,
      runtime: { ...template.runtime, mechanismComponent: "Typing" },
    };
    expect(RegisteredGameTemplateSchema.safeParse(mismatched).success).toBe(
      false,
    );
  });

  it("직접 게임에는 미지원 time-attack binding을 허용하지 않는다", () => {
    expect(
      RegisteredGameBindingSchema.safeParse({
        ...bindingInput,
        id: "factorization-time-attack",
        gameId: "factorization",
        mode: "time-attack",
      }).success,
    ).toBe(false);
  });

  it("메커니즘 게임은 지원 mode를 binding에 고정할 수 있다", () => {
    const parsed = RegisteredGameBindingSchema.parse({
      ...bindingInput,
      mode: "deep-recall",
    });
    expect(parsed.mode).toBe("deep-recall");
  });
});

describe("Library 계약 — 코드/교육 데이터 분리", () => {
  const DatasetSchema = createRegisteredCurriculumDatasetSchema(
    QuickQuizCardSchema,
  );

  it("기존 게임 카드 Zod schema를 그대로 사용해 CurriculumDataset을 검증한다", () => {
    const result = DatasetSchema.parse({
      kind: "curriculum-dataset",
      schemaVersion: "1.0",
      id: curriculumRef.id,
      version: curriculumRef.version,
      title: "수학 빠른 퀴즈",
      locale: "ko-KR",
      scope: { kind: "registered-game", gameId: "math-quick-quiz" },
      items: quickQuizCards,
    });
    expect(result.items).toHaveLength(quickQuizCards.length);
  });

  it("CurriculumDataset에 runtime 코드가 섞이면 strict 검증으로 거부한다", () => {
    expect(
      DatasetSchema.safeParse({
        kind: "curriculum-dataset",
        schemaVersion: "1.0",
        id: curriculumRef.id,
        version: curriculumRef.version,
        title: "수학 빠른 퀴즈",
        locale: "ko-KR",
        scope: { kind: "registered-game", gameId: "math-quick-quiz" },
        items: quickQuizCards,
        runtime: { gameId: "math-quick-quiz" },
      }).success,
    ).toBe(false);
  });

  it("GameTemplate에 items가 섞이면 strict 검증으로 거부한다", () => {
    const template = gameTemplateFromManifest(games[0]!, {
      version: "1.0.0",
      protocolVersion: "1.0.0",
      curriculumSlots: [{ id: "cards" }],
    });
    expect(
      RegisteredGameTemplateSchema.safeParse({
        ...template,
        items: quickQuizCards,
      }).success,
    ).toBe(false);
  });
});

describe("Library 계약 — 버전/launch/event", () => {
  const binding = RegisteredGameBindingSchema.parse(bindingInput);
  const activity = pinGameActivity(binding);
  const token = {
    tokenVersion: "1.0",
    iss: "pullim-library",
    aud: "pullim-games",
    sub: "anon_01",
    jti: "launch_01",
    iat: 1_784_560_000,
    exp: 1_784_560_300,
    anonymousUserId: "anon_01",
    sessionId: "session_01",
    activity,
  };

  it("정확한 버전만 허용하고 latest/semver range를 거부한다", () => {
    for (const version of ["1.2.3", "2026.07.1", "git-a1b2c3d4"]) {
      expect(PinnedVersionSchema.safeParse(version).success).toBe(true);
    }
    for (const version of [
      "latest",
      "main",
      "next",
      "1.2.x",
      "^1.2.3",
      "~1.2.3",
      ">=1.0.0",
      "*",
    ]) {
      expect(PinnedVersionSchema.safeParse(version).success).toBe(false);
    }
  });

  it("LaunchToken payload는 익명 subject와 고정된 활동 스냅샷을 요구한다", () => {
    expect(LaunchTokenPayloadSchema.parse(token).activity).toEqual(activity);
    expect(
      LaunchTokenPayloadSchema.safeParse({ ...token, sub: "different" })
        .success,
    ).toBe(false);
    expect(
      LaunchTokenPayloadSchema.safeParse({ ...token, exp: token.iat }).success,
    ).toBe(false);
  });

  it("POST handoff용 binding integrity를 하위호환 옵션으로 고정", () => {
    expect(
      pinGameActivity(binding, { bindingIntegrity: "sha256-binding" })
        .binding.integrity,
    ).toBe("sha256-binding");
    expect(pinGameActivity(binding).binding.integrity).toBeUndefined();
  });

  it("LearningEvent는 필수 eventId로 재전송 멱등성을 보장한다", () => {
    const event = {
      schemaVersion: "1.0",
      eventId: "event_01",
      type: "learning.attempted",
      ts: 1_784_560_050_000,
      anonymousUserId: token.anonymousUserId,
      sessionId: token.sessionId,
      activity,
      itemId: quickQuizCards[0]!.id,
      payload: { correct: true },
    };
    expect(LearningEventSchema.safeParse(event).success).toBe(true);

    const { eventId: _eventId, ...withoutEventId } = event;
    expect(LearningEventSchema.safeParse(withoutEventId).success).toBe(false);
  });

  it("기존 EventAction도 공통 LearningEvent type으로 점진 수용한다", () => {
    const SubmitPayloadSchema = createLearningEventSchema(
      QuickQuizCardSchema.pick({ id: true }),
    );
    expect(
      SubmitPayloadSchema.safeParse({
        schemaVersion: "1.0",
        eventId: "event_submit_01",
        type: "submit",
        ts: 1_784_560_060_000,
        anonymousUserId: token.anonymousUserId,
        sessionId: token.sessionId,
        activity,
        payload: { id: quickQuizCards[0]!.id },
      }).success,
    ).toBe(true);
  });
});
