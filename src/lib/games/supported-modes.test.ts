// supported-modes 판정 — Plan E Phase 5 / PR #92 Codex round 1 fix.

import { describe, expect, it } from "vitest";
import {
  getAuxiliaryModesFor,
  isMechanismBasedGame,
  isModeSupportedFor,
} from "./supported-modes";

describe("isMechanismBasedGame", () => {
  it("4 메커니즘 컴포넌트 기반 게임 9종을 인식한다", () => {
    const mechanismGames = [
      "math-quick-quiz",
      "english-blank",
      "english-vocab-typing",
      "english-word-match",
      "vocab-typing",
      "custom-blank",
      "custom-multiple-choice",
      "custom-typing",
      "custom-word-match",
    ];
    for (const id of mechanismGames) {
      expect(isMechanismBasedGame(id)).toBe(true);
    }
  });

  it("직접 게임은 비지원으로 판정한다 (TimeAttackTimer/DeepRecallEmpty 미통합)", () => {
    const directGames = [
      "factorization",
      "image-hotspot",
      "chemistry-balance",
      "bio-taxonomy",
      "physics-vector",
      "genetics-punnett",
      "history-timeline",
      "english-order",
      "letter-assembly",
      "korean-pos-tagging",
      "math-graph-shift",
      "cloze-multi",
    ];
    for (const id of directGames) {
      expect(isMechanismBasedGame(id)).toBe(false);
    }
  });
});

describe("isModeSupportedFor", () => {
  it("default 모드는 모든 게임 지원", () => {
    expect(isModeSupportedFor("factorization", "default")).toBe(true);
    expect(isModeSupportedFor("math-quick-quiz", "default")).toBe(true);
  });

  it("review-queue 는 모든 게임 지원 (selectCardsForMode 가 SRS 위에서만 동작)", () => {
    expect(isModeSupportedFor("factorization", "review-queue")).toBe(true);
    expect(isModeSupportedFor("math-quick-quiz", "review-queue")).toBe(true);
  });

  it("time-attack 은 4 메커니즘 게임만 지원 (TimeAttackTimer UI 필요)", () => {
    expect(isModeSupportedFor("math-quick-quiz", "time-attack")).toBe(true);
    expect(isModeSupportedFor("english-blank", "time-attack")).toBe(true);
    expect(isModeSupportedFor("factorization", "time-attack")).toBe(false);
    expect(isModeSupportedFor("image-hotspot", "time-attack")).toBe(false);
    expect(isModeSupportedFor("chemistry-balance", "time-attack")).toBe(false);
  });

  it("deep-recall 은 4 메커니즘 게임만 지원 (DeepRecallEmpty UI 필요)", () => {
    expect(isModeSupportedFor("vocab-typing", "deep-recall")).toBe(true);
    expect(isModeSupportedFor("english-word-match", "deep-recall")).toBe(true);
    expect(isModeSupportedFor("factorization", "deep-recall")).toBe(false);
    expect(isModeSupportedFor("history-timeline", "deep-recall")).toBe(false);
  });
});

describe("getAuxiliaryModesFor", () => {
  it("4 메커니즘 게임은 review-queue/time-attack/deep-recall 3종 지원", () => {
    expect(getAuxiliaryModesFor("math-quick-quiz")).toEqual([
      "review-queue",
      "time-attack",
      "deep-recall",
    ]);
  });

  it("직접 게임은 review-queue 만 지원 — time-attack/deep-recall chip 노출 차단", () => {
    expect(getAuxiliaryModesFor("factorization")).toEqual(["review-queue"]);
    expect(getAuxiliaryModesFor("image-hotspot")).toEqual(["review-queue"]);
  });

  it("default 모드는 보조 chip 후보에서 제외 (본 진입은 ?mode 미지정 link)", () => {
    expect(getAuxiliaryModesFor("math-quick-quiz")).not.toContain("default");
  });
});
