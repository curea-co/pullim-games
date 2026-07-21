import type { CatalogPath, GameMode } from "@/lib/core";
import type { CurriculumSeed } from "@/lib/core/curriculum/types";
import type { GameMeta } from "@/lib/games/types";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | readonly JsonValue[];
export type JsonObject = {
  readonly [key: string]: JsonValue;
};

export type ContractSchemaVersion = "1.0";
export type PinnedVersion = string;
export type AnonymousUserId = string;
export type EventId = string;
export type SessionId = string;

export type ArtifactKind =
  | "game-template"
  | "curriculum-dataset"
  | "game-binding";

export interface VersionedArtifactRef<
  TKind extends ArtifactKind = ArtifactKind,
> {
  readonly kind: TKind;
  readonly id: string;
  /** `latest`나 semver range가 아닌 Library가 해석한 불변 버전. */
  readonly version: PinnedVersion;
  readonly integrity?: string;
}

export type GameTemplateRef = VersionedArtifactRef<"game-template">;
export type CurriculumDatasetRef =
  VersionedArtifactRef<"curriculum-dataset">;
export type GameBindingRef = VersionedArtifactRef<"game-binding">;
/** @deprecated 새 코드에서는 GameBindingRef를 사용한다. */
export type GameActivityRef = GameBindingRef;

/** 기존 GameMeta가 정본인 4개 공용 메커니즘 식별자. */
export type ReusableMechanismComponent = NonNullable<
  GameMeta["mechanismComponent"]
>;

export interface CurriculumSlotDefinition {
  readonly id: string;
  readonly description?: string;
  readonly acceptedCardTypes?: readonly string[];
  readonly required?: boolean;
}

/** registry의 동적 component를 가리키는 코드 참조. 교육 데이터는 포함하지 않는다. */
export interface RegisteredGameRuntime {
  readonly kind: "registered-game";
  readonly gameId: GameMeta["id"];
  readonly protocolVersion: string;
  readonly mechanismComponent?: ReusableMechanismComponent;
}

export interface GameTemplate<TDefaultConfig = JsonObject> {
  readonly kind: "game-template";
  readonly schemaVersion: ContractSchemaVersion;
  readonly id: string;
  readonly version: PinnedVersion;
  readonly title: string;
  readonly description?: string;
  readonly runtime: RegisteredGameRuntime;
  readonly curriculumSlots: readonly CurriculumSlotDefinition[];
  readonly supportedModes: readonly GameMode[];
  readonly defaultConfig?: TDefaultConfig;
  readonly metadata?: Readonly<Record<string, JsonValue>>;

  /** 템플릿 코드와 교육 데이터의 혼입을 컴파일 단계에서도 차단한다. */
  readonly curriculum?: never;
  readonly dataset?: never;
  readonly items?: never;
}

export type CurriculumScope =
  | {
      readonly kind: "catalog";
      readonly path: CatalogPath;
    }
  | {
      readonly kind: "seed";
      readonly subjectId: CurriculumSeed["subjectId"];
      readonly unitId: CurriculumSeed["unitId"];
    }
  | {
      readonly kind: "registered-game";
      readonly gameId: GameMeta["id"];
      readonly unit?: string;
    };

/**
 * 기존 게임별 카드 타입을 TItem으로 그대로 감싸는 버전 고정 데이터셋.
 * 별도 공통 카드 타입을 만들지 않아 CardBase/게임별 schema와 중복되지 않는다.
 */
export interface CurriculumDataset<TItem = JsonValue> {
  readonly kind: "curriculum-dataset";
  readonly schemaVersion: ContractSchemaVersion;
  readonly id: string;
  readonly version: PinnedVersion;
  readonly title: string;
  readonly locale: string;
  readonly scope: CurriculumScope;
  readonly standards?: readonly string[];
  readonly items: readonly TItem[];
  readonly metadata?: Readonly<Record<string, JsonValue>>;

  /** 교육 데이터에 실행 코드를 넣지 않는다. */
  readonly template?: never;
  readonly runtime?: never;
  readonly entrypoint?: never;
}

export interface CurriculumSelection {
  readonly strategy: "all" | "adaptive" | "random" | "sequential";
  readonly limit?: number;
  readonly itemIds?: readonly string[];
  readonly tags?: readonly string[];
}

export interface CurriculumSlotBinding {
  readonly slotId: string;
  readonly selection: CurriculumSelection;
}

/** registry game + FSRS mode + 코드/데이터 버전을 하나의 Library 활동으로 묶는다. */
export interface GameBinding<TConfig = JsonObject> {
  readonly kind: "game-binding";
  readonly schemaVersion: ContractSchemaVersion;
  readonly id: string;
  readonly version: PinnedVersion;
  readonly title?: string;
  readonly gameId: GameMeta["id"];
  readonly mode: GameMode;
  readonly template: GameTemplateRef;
  readonly curriculum: CurriculumDatasetRef;
  readonly slots: readonly CurriculumSlotBinding[];
  readonly config?: TConfig;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

/** @deprecated 기존 Library 소비자는 GameActivity 명칭을 계속 사용할 수 있다. */
export type GameActivity<TConfig = JsonObject> = GameBinding<TConfig>;

/** launch 시점에 전이 의존성까지 해석을 끝낸 활동 스냅샷. */
export interface PinnedGameActivity {
  readonly binding: GameBindingRef;
  readonly template: GameTemplateRef;
  readonly curriculum: CurriculumDatasetRef;
  readonly gameId: GameMeta["id"];
  readonly mode: GameMode;
}

/** 서명·직렬화된 compact launch token. */
export type LaunchToken = string;
export type LaunchTokenVersion = "1.0";

export interface LaunchTokenPayload<TLaunchConfig = JsonObject> {
  readonly tokenVersion: LaunchTokenVersion;
  readonly iss: string;
  readonly aud: string | readonly string[];
  /** anonymousUserId와 같은 익명 subject. 원본 회원 ID나 PII를 넣지 않는다. */
  readonly sub: AnonymousUserId;
  readonly jti: string;
  /** JWT NumericDate(epoch seconds). */
  readonly iat: number;
  readonly nbf?: number;
  readonly exp: number;
  readonly anonymousUserId: AnonymousUserId;
  readonly sessionId: SessionId;
  readonly activity: PinnedGameActivity;
  readonly launchConfig?: TLaunchConfig;
  readonly scopes?: readonly string[];
}

/** @deprecated LaunchTokenPayload를 사용한다. */
export type LaunchTokenClaims<TLaunchConfig = JsonObject> =
  LaunchTokenPayload<TLaunchConfig>;

export type SemanticLearningEventType =
  | "launch.started"
  | "learning.attempted"
  | "learning.struggled"
  | "learning.completed"
  | "session.completed"
  | "session.abandoned";

/**
 * Library와 게임 서비스가 함께 사용하는 append-only 이벤트 봉투.
 * `type`/`ts`는 기존 학습 이벤트 관례를 유지하고, 기존 게임 EventAction도 허용한다.
 */
export interface LearningEvent<
  TType extends string = string,
  TPayload = JsonObject,
> {
  readonly schemaVersion: ContractSchemaVersion;
  /** enqueue 때 한 번 발급하고 재시도/배치 재전송에서 재사용하는 멱등키. */
  readonly eventId: EventId;
  readonly type: TType;
  /** epoch milliseconds. */
  readonly ts: number;
  readonly anonymousUserId: AnonymousUserId;
  readonly sessionId: SessionId;
  readonly activity: PinnedGameActivity;
  readonly standardId?: string;
  readonly itemId?: string;
  readonly durationMs?: number;
  readonly payload: TPayload;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

export type GameLearningEvent<
  TType extends string = string,
  TPayload = JsonObject,
> = LearningEvent<TType, TPayload>;
