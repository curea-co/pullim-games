// 풀림 게임즈 공유 인프라 — Read-only 계약 barrel.
//
// 게임 모듈은 이 barrel만 import 한다.
// internal 경로(`@/lib/core/fsrs/internal/*`) 직접 import 금지 (Phase R3 ESLint 강제 예정).
// lib/core 변경은 별도 PR + 모든 게임 테스트 매트릭스 실행.
//
// 상세: proc/plan/2026-05-08_parallel-game-architecture.md §5.4

export * from "./schema";
export * from "./fingerprint";
export * from "./fsrs";
export * from "./ast";
export * from "./storage";
export * from "./event";
export * from "./recommendation";
export * from "./dashboard";
export * from "./custom";
export * from "./curriculum";
export * from "./streak";
