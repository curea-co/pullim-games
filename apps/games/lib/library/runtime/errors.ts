export type LibraryRuntimeErrorCode =
  | "artifact_invalid"
  | "artifact_mismatch"
  | "artifact_not_found"
  | "audience_mismatch"
  | "direct_game_not_found"
  | "event_activity_mismatch"
  | "event_queue_invalid"
  | "issuer_mismatch"
  | "launch_mode_mismatch"
  | "launch_route_mismatch"
  | "runtime_not_configured"
  | "token_expired"
  | "token_invalid"
  | "token_issued_in_future"
  | "token_lifetime_exceeded"
  | "token_not_yet_valid"
  | "token_verification_failed";

export class LibraryRuntimeError extends Error {
  readonly code: LibraryRuntimeErrorCode;

  constructor(code: LibraryRuntimeErrorCode, message: string) {
    super(message);
    this.name = "LibraryRuntimeError";
    this.code = code;
  }
}
