import { z } from "zod";

import type { GameMode } from "@/lib/core";
import { getGameById } from "@/lib/games/registry";
import { normalizeModeForGame } from "@/lib/games/supported-modes";

import {
  createRegisteredCurriculumDatasetSchema,
  RegisteredGameBindingSchema,
  RegisteredGameTemplateSchema,
} from "../registry-validation";
import {
  GameModeSchema,
  JsonValueSchema,
  LaunchTokenPayloadSchema,
} from "../schemas";
import type {
  CurriculumDataset,
  CurriculumDatasetRef,
  GameBinding,
  GameBindingRef,
  GameTemplate,
  GameTemplateRef,
  JsonValue,
  LaunchToken,
  LaunchTokenPayload,
  PinnedVersion,
  VersionedArtifactRef,
} from "../types";
import { LibraryRuntimeError } from "./errors";

export interface LaunchTokenVerifier {
  /**
   * compact token의 서명·알고리즘·키 신뢰 체인을 검증한 뒤 payload만 반환한다.
   * 단순 base64 decode 구현은 이 계약을 충족하지 않는다.
   */
  verify(token: LaunchToken): Promise<unknown>;
}

export interface ResolvedArtifact {
  readonly value: unknown;
  /** ref에 integrity가 있으면 resolver도 검증한 동일 값을 반환해야 한다. */
  readonly integrity?: string;
}

export interface LibraryArtifactResolver {
  resolveBinding(ref: GameBindingRef): Promise<ResolvedArtifact | null>;
  resolveTemplate(ref: GameTemplateRef): Promise<ResolvedArtifact | null>;
  resolveCurriculum(
    ref: CurriculumDatasetRef,
  ): Promise<ResolvedArtifact | null>;
}

export interface LaunchValidationPolicy {
  readonly issuer: string | readonly string[];
  readonly audience: string;
  /** 단기 토큰 상한. 소비자가 제품 정책에 맞는 값을 명시한다. */
  readonly maxTokenLifetimeSeconds: number;
  readonly clockToleranceSeconds?: number;
  /** 테스트 가능한 epoch milliseconds clock. */
  readonly now?: () => number;
}

export interface LaunchRuntimeDependencies<TItem = JsonValue> {
  readonly verifier: LaunchTokenVerifier;
  readonly artifacts: LibraryArtifactResolver;
  readonly policy: LaunchValidationPolicy;
  /** 게임별 기존 card schema를 포함한 Dataset parser를 주입할 수 있다. */
  readonly parseCurriculumDataset?: (
    input: unknown,
  ) => CurriculumDataset<TItem>;
}

export interface ResolvedLibraryLaunch<TItem = JsonValue> {
  readonly source: "library";
  readonly payload: LaunchTokenPayload;
  readonly binding: GameBinding;
  readonly template: GameTemplate;
  readonly curriculum: CurriculumDataset<TItem>;
}

export interface DirectGameLaunch {
  readonly source: "direct";
  readonly gameId: string;
  readonly mode: GameMode;
}

export type ResolvedGameRouteLaunch<TItem = JsonValue> =
  | DirectGameLaunch
  | ResolvedLibraryLaunch<TItem>;

export interface GameRouteLaunchInput {
  readonly gameId: string;
  readonly requestedMode?: string | null;
  readonly token?: LaunchToken | null;
}

const DefaultCurriculumDatasetSchema =
  createRegisteredCurriculumDatasetSchema(JsonValueSchema);

function runtimeError(
  code: ConstructorParameters<typeof LibraryRuntimeError>[0],
  message: string,
): never {
  throw new LibraryRuntimeError(code, message);
}

function parseOrThrow<T>(
  schema: z.ZodType<T>,
  input: unknown,
  label: string,
): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return runtimeError("artifact_invalid", `${label} 검증에 실패했습니다.`);
  }
  return parsed.data;
}

function includesIssuer(
  expected: string | readonly string[],
  actual: string,
): boolean {
  return typeof expected === "string"
    ? expected === actual
    : expected.includes(actual);
}

function includesAudience(
  actual: string | readonly string[],
  expected: string,
): boolean {
  return typeof actual === "string"
    ? actual === expected
    : actual.includes(expected);
}

function assertTokenPolicy(
  payload: LaunchTokenPayload,
  policy: LaunchValidationPolicy,
): void {
  if (!includesIssuer(policy.issuer, payload.iss)) {
    runtimeError("issuer_mismatch", "허용되지 않은 launch token issuer입니다.");
  }
  if (!includesAudience(payload.aud, policy.audience)) {
    runtimeError("audience_mismatch", "launch token audience가 일치하지 않습니다.");
  }

  if (
    !Number.isFinite(policy.maxTokenLifetimeSeconds) ||
    policy.maxTokenLifetimeSeconds <= 0
  ) {
    runtimeError(
      "token_invalid",
      "maxTokenLifetimeSeconds는 양수여야 합니다.",
    );
  }

  const nowMilliseconds = policy.now?.() ?? Date.now();
  const tolerance = policy.clockToleranceSeconds ?? 0;
  if (!Number.isFinite(nowMilliseconds) || nowMilliseconds < 0) {
    runtimeError("token_invalid", "launch token 검증 clock이 유효하지 않습니다.");
  }
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    runtimeError(
      "token_invalid",
      "clockToleranceSeconds는 0 이상의 유한값이어야 합니다.",
    );
  }
  const nowSeconds = Math.floor(nowMilliseconds / 1_000);

  if (payload.iat > nowSeconds + tolerance) {
    runtimeError(
      "token_issued_in_future",
      "launch token이 미래 시각에 발급되었습니다.",
    );
  }
  if (payload.nbf !== undefined && payload.nbf > nowSeconds + tolerance) {
    runtimeError(
      "token_not_yet_valid",
      "launch token의 사용 가능 시각이 아직 오지 않았습니다.",
    );
  }
  if (payload.exp <= nowSeconds - tolerance) {
    runtimeError("token_expired", "launch token이 만료되었습니다.");
  }
  if (payload.exp - payload.iat > policy.maxTokenLifetimeSeconds) {
    runtimeError(
      "token_lifetime_exceeded",
      "launch token 유효 기간이 정책 상한을 초과했습니다.",
    );
  }
}

function assertArtifactRef(
  expected: VersionedArtifactRef,
  actual: { readonly kind: string; readonly id: string; readonly version: PinnedVersion },
  resolved: ResolvedArtifact,
  label: string,
): void {
  if (
    actual.kind !== expected.kind ||
    actual.id !== expected.id ||
    actual.version !== expected.version
  ) {
    runtimeError(
      "artifact_mismatch",
      `${label}이 요청한 고정 버전과 일치하지 않습니다.`,
    );
  }
  if (
    expected.integrity !== undefined &&
    resolved.integrity !== expected.integrity
  ) {
    runtimeError(
      "artifact_mismatch",
      `${label} integrity가 일치하지 않습니다.`,
    );
  }
}

function sameArtifactRef(
  left: VersionedArtifactRef,
  right: VersionedArtifactRef,
): boolean {
  return (
    left.kind === right.kind &&
    left.id === right.id &&
    left.version === right.version &&
    left.integrity === right.integrity
  );
}

function assertArtifactGraph<TItem>(
  payload: LaunchTokenPayload,
  binding: GameBinding,
  template: GameTemplate,
  curriculum: CurriculumDataset<TItem>,
): void {
  const pinned = payload.activity;

  if (
    binding.gameId !== pinned.gameId ||
    binding.mode !== pinned.mode ||
    template.runtime.gameId !== pinned.gameId
  ) {
    runtimeError(
      "artifact_mismatch",
      "binding, template, launch activity의 게임 또는 mode가 일치하지 않습니다.",
    );
  }
  if (
    !sameArtifactRef(binding.template, pinned.template) ||
    !sameArtifactRef(binding.curriculum, pinned.curriculum)
  ) {
    runtimeError(
      "artifact_mismatch",
      "binding의 전이 참조가 launch activity와 일치하지 않습니다.",
    );
  }
  if (!template.supportedModes.includes(binding.mode)) {
    runtimeError(
      "artifact_mismatch",
      "template이 binding mode를 지원하지 않습니다.",
    );
  }
  if (
    curriculum.scope.kind === "registered-game" &&
    curriculum.scope.gameId !== pinned.gameId
  ) {
    runtimeError(
      "artifact_mismatch",
      "curriculum dataset의 registered-game scope가 launch와 다릅니다.",
    );
  }

  const templateSlots = new Map(
    template.curriculumSlots.map((slot) => [slot.id, slot]),
  );
  if (templateSlots.size !== template.curriculumSlots.length) {
    runtimeError(
      "artifact_mismatch",
      "template curriculum slot id는 중복될 수 없습니다.",
    );
  }
  const boundSlotIds = new Set<string>();
  for (const slot of binding.slots) {
    if (!templateSlots.has(slot.slotId) || boundSlotIds.has(slot.slotId)) {
      runtimeError(
        "artifact_mismatch",
        "binding curriculum slot이 template 정의와 일치하지 않습니다.",
      );
    }
    boundSlotIds.add(slot.slotId);
  }
  for (const slot of template.curriculumSlots) {
    if (slot.required && !boundSlotIds.has(slot.id)) {
      runtimeError(
        "artifact_mismatch",
        `필수 curriculum slot이 binding에 없습니다: ${slot.id}`,
      );
    }
  }
}

async function resolveArtifactGraph<TItem>(
  payload: LaunchTokenPayload,
  dependencies: LaunchRuntimeDependencies<TItem>,
): Promise<Omit<ResolvedLibraryLaunch<TItem>, "payload" | "source">> {
  const [bindingResult, templateResult, curriculumResult] = await Promise.all([
    dependencies.artifacts.resolveBinding(payload.activity.binding),
    dependencies.artifacts.resolveTemplate(payload.activity.template),
    dependencies.artifacts.resolveCurriculum(payload.activity.curriculum),
  ]);

  if (!bindingResult || !templateResult || !curriculumResult) {
    return runtimeError(
      "artifact_not_found",
      "고정된 Library artifact를 모두 찾을 수 없습니다.",
    );
  }

  const binding = parseOrThrow(
    RegisteredGameBindingSchema,
    bindingResult.value,
    "GameBinding",
  );
  const template = parseOrThrow(
    RegisteredGameTemplateSchema,
    templateResult.value,
    "GameTemplate",
  );

  let curriculum: CurriculumDataset<TItem>;
  try {
    curriculum = dependencies.parseCurriculumDataset
      ? dependencies.parseCurriculumDataset(curriculumResult.value)
      : (DefaultCurriculumDatasetSchema.parse(
          curriculumResult.value,
        ) as unknown as CurriculumDataset<TItem>);
  } catch {
    return runtimeError(
      "artifact_invalid",
      "CurriculumDataset 검증에 실패했습니다.",
    );
  }

  assertArtifactRef(
    payload.activity.binding,
    binding,
    bindingResult,
    "GameBinding",
  );
  assertArtifactRef(
    payload.activity.template,
    template,
    templateResult,
    "GameTemplate",
  );
  assertArtifactRef(
    payload.activity.curriculum,
    curriculum,
    curriculumResult,
    "CurriculumDataset",
  );
  assertArtifactGraph(payload, binding, template, curriculum);

  return { binding, template, curriculum };
}

/** 서명 검증 → payload 정책 검증 → 고정 artifact graph 검증을 한 경계에서 수행한다. */
export async function resolveLibraryLaunch<TItem = JsonValue>(
  token: LaunchToken,
  dependencies: LaunchRuntimeDependencies<TItem>,
): Promise<ResolvedLibraryLaunch<TItem>> {
  let verifiedPayload: unknown;
  try {
    verifiedPayload = await dependencies.verifier.verify(token);
  } catch {
    return runtimeError(
      "token_verification_failed",
      "launch token 암호 검증에 실패했습니다.",
    );
  }

  const parsedPayload = LaunchTokenPayloadSchema.safeParse(verifiedPayload);
  if (!parsedPayload.success) {
    return runtimeError("token_invalid", "launch token payload가 유효하지 않습니다.");
  }

  assertTokenPolicy(parsedPayload.data, dependencies.policy);
  const artifacts = await resolveArtifactGraph(parsedPayload.data, dependencies);

  return {
    source: "library",
    payload: parsedPayload.data,
    ...artifacts,
  };
}

function parseRequestedMode(mode: string | null | undefined): GameMode {
  if (mode === undefined || mode === null || mode === "") return "default";
  const parsed = GameModeSchema.safeParse(mode);
  return parsed.success ? parsed.data : "default";
}

/**
 * `/games/[gameId]` 연결 경계. token이 없으면 기존 직접 실행을 그대로 유지한다.
 * token이 있으면 URL gameId/mode가 서명된 activity를 덮어쓰지 못하게 대조한다.
 */
export async function resolveGameRouteLaunch<TItem = JsonValue>(
  input: GameRouteLaunchInput,
  dependencies?: LaunchRuntimeDependencies<TItem>,
): Promise<ResolvedGameRouteLaunch<TItem>> {
  const manifest = getGameById(input.gameId);
  if (!manifest || manifest.meta.status !== "available") {
    return runtimeError(
      "direct_game_not_found",
      "실행 가능한 registry gameId가 아닙니다.",
    );
  }

  if (!input.token) {
    const requestedMode = parseRequestedMode(input.requestedMode);
    return {
      source: "direct",
      gameId: input.gameId,
      mode: normalizeModeForGame(input.gameId, requestedMode),
    };
  }
  if (!dependencies) {
    return runtimeError(
      "runtime_not_configured",
      "Library launch runtime이 구성되지 않았습니다.",
    );
  }

  const launch = await resolveLibraryLaunch(input.token, dependencies);
  if (launch.payload.activity.gameId !== input.gameId) {
    return runtimeError(
      "launch_route_mismatch",
      "route gameId와 서명된 launch activity가 일치하지 않습니다.",
    );
  }
  if (
    input.requestedMode !== undefined &&
    input.requestedMode !== null &&
    input.requestedMode !== "" &&
    input.requestedMode !== launch.payload.activity.mode
  ) {
    return runtimeError(
      "launch_mode_mismatch",
      "URL mode가 서명된 launch activity mode와 일치하지 않습니다.",
    );
  }
  return launch;
}
