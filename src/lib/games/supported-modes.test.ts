// supported-modes 판정 — Plan E Phase 5 / PR #92 Codex round 1·4 fix.
//
// PR #92 Codex round 4: 게임 카탈로그/메커니즘 목록을 테스트에 하드코딩하면
// registry drift 가 발생한다 — registry 에서 직접 도출해 검증한다.

import { describe, expect, it } from "vitest";
import { games } from "./registry";
import {
  getAuxiliaryModesFor,
  getMechanismBasedGameIds,
  isMechanismBasedGame,
  isModeSupportedFor,
  normalizeModeForGame,
} from "./supported-modes";

// registry 에서 도출 — manifest.meta.mechanismComponent 단일 진실원.
const mechanismGameIds = games
  .filter((g) => g.meta.mechanismComponent !== undefined)
  .map((g) => g.meta.id);
const directGameIds = games
  .filter((g) => g.meta.mechanismComponent === undefined)
  .map((g) => g.meta.id);
const allGameIds = games.map((g) => g.meta.id);

describe("getMechanismBasedGameIds (Codex round 4 — single source of truth)", () => {
  it("manifest.meta.mechanismComponent 가 명시된 게임만 반환한다", () => {
    expect(getMechanismBasedGameIds().slice().sort()).toEqual(
      mechanismGameIds.slice().sort(),
    );
  });

  it("registry 가 비어있지 않다 (회귀 sanity)", () => {
    expect(allGameIds.length).toBeGreaterThan(0);
    expect(mechanismGameIds.length).toBeGreaterThan(0);
    expect(directGameIds.length).toBeGreaterThan(0);
  });
});

describe("isMechanismBasedGame", () => {
  it("manifest 에 mechanismComponent 가 명시된 게임을 인식한다", () => {
    for (const id of mechanismGameIds) {
      expect(isMechanismBasedGame(id)).toBe(true);
    }
  });

  it("직접 게임 (mechanismComponent 누락) 은 비지원으로 판정한다", () => {
    for (const id of directGameIds) {
      expect(isMechanismBasedGame(id)).toBe(false);
    }
  });

  it("registry 에 없는 게임 id 는 false", () => {
    expect(isMechanismBasedGame("nonexistent-game")).toBe(false);
  });
});

describe("isModeSupportedFor", () => {
  it("default 모드는 모든 게임 지원", () => {
    for (const id of allGameIds) {
      expect(isModeSupportedFor(id, "default")).toBe(true);
    }
  });

  it("review-queue 는 모든 게임 지원 (selectCardsForMode 가 SRS 위에서만 동작)", () => {
    for (const id of allGameIds) {
      expect(isModeSupportedFor(id, "review-queue")).toBe(true);
    }
  });

  it("time-attack 은 메커니즘 기반 게임만 지원 (TimeAttackTimer UI 필요)", () => {
    for (const id of mechanismGameIds) {
      expect(isModeSupportedFor(id, "time-attack")).toBe(true);
    }
    for (const id of directGameIds) {
      expect(isModeSupportedFor(id, "time-attack")).toBe(false);
    }
  });

  it("deep-recall 은 메커니즘 기반 게임만 지원 (DeepRecallEmpty UI 필요)", () => {
    for (const id of mechanismGameIds) {
      expect(isModeSupportedFor(id, "deep-recall")).toBe(true);
    }
    for (const id of directGameIds) {
      expect(isModeSupportedFor(id, "deep-recall")).toBe(false);
    }
  });
});

describe("getAuxiliaryModesFor", () => {
  it("메커니즘 게임은 review-queue/time-attack/deep-recall 3종 지원", () => {
    for (const id of mechanismGameIds) {
      expect(getAuxiliaryModesFor(id)).toEqual([
        "review-queue",
        "time-attack",
        "deep-recall",
      ]);
    }
  });

  it("직접 게임은 review-queue 만 지원 — time-attack/deep-recall chip 노출 차단", () => {
    for (const id of directGameIds) {
      expect(getAuxiliaryModesFor(id)).toEqual(["review-queue"]);
    }
  });

  it("default 모드는 보조 chip 후보에서 제외 (본 진입은 ?mode 미지정 link)", () => {
    for (const id of allGameIds) {
      expect(getAuxiliaryModesFor(id)).not.toContain("default");
    }
  });

  // PR #92 Codex round 2 fix:
  //   nav 가 사라지는 회귀(=auxiliary 가 비어 컴포넌트가 null 을 반환)를 잡는다.
  //   review-queue 가 모든 게임 지원이라는 계약이 깨지면 nav 가 null 이 되며,
  //   본 테스트가 fail 하여 회귀를 명시.
  it("review-queue 는 모든 게임에서 노출되어야 한다 (nav 미렌더 회귀 차단)", () => {
    for (const id of allGameIds) {
      const modes = getAuxiliaryModesFor(id);
      expect(modes.length).toBeGreaterThan(0);
      expect(modes).toContain("review-queue");
    }
  });
});

describe("normalizeModeForGame (Codex round 4 — URL 직접 진입 가드)", () => {
  it("지원 mode 는 그대로 반환", () => {
    expect(normalizeModeForGame("math-quick-quiz", "time-attack")).toBe(
      "time-attack",
    );
    expect(normalizeModeForGame("math-quick-quiz", "deep-recall")).toBe(
      "deep-recall",
    );
    expect(normalizeModeForGame("factorization", "review-queue")).toBe(
      "review-queue",
    );
    expect(normalizeModeForGame("factorization", "default")).toBe("default");
  });

  it("비지원 mode 는 default 로 정규화 — `?mode=time-attack` 직접 URL 진입 회귀 차단", () => {
    for (const id of directGameIds) {
      expect(normalizeModeForGame(id, "time-attack")).toBe("default");
      expect(normalizeModeForGame(id, "deep-recall")).toBe("default");
    }
  });

  it("registry 미등록 game id 는 default 로 정규화", () => {
    expect(normalizeModeForGame("nonexistent-game", "time-attack")).toBe(
      "default",
    );
    expect(normalizeModeForGame("nonexistent-game", "deep-recall")).toBe(
      "default",
    );
    // review-queue / default 는 모든 게임 지원이라 정규화 영향 없음.
    expect(normalizeModeForGame("nonexistent-game", "review-queue")).toBe(
      "review-queue",
    );
    expect(normalizeModeForGame("nonexistent-game", "default")).toBe("default");
  });
});

describe("registry drift sanity (Codex round 4)", () => {
  // 새 메커니즘 게임 추가가 manifest 한 곳만 갱신해도 정상 동작하는지 보장.
  // "manifest 가 mechanismComponent 를 누락하지 않은 한, 진입점이 사라지지 않는다"
  // 는 single source of truth 계약을 보호한다.
  it("registry 의 mechanism 게임 = supported-modes 가 인식하는 게임 (대칭성)", () => {
    const fromRegistry = games
      .filter((g) => g.meta.mechanismComponent !== undefined)
      .map((g) => g.meta.id)
      .sort();
    const fromHelper = getMechanismBasedGameIds().slice().sort();
    expect(fromHelper).toEqual(fromRegistry);
  });

  it("모든 메커니즘 게임은 4 컴포넌트 중 하나로 명시", () => {
    const valid = new Set(["Blank", "QuickQuiz", "Typing", "WordMatch"]);
    for (const g of games) {
      if (g.meta.mechanismComponent === undefined) continue;
      expect(valid.has(g.meta.mechanismComponent)).toBe(true);
    }
  });
});
