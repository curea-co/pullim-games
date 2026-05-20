// TimeAttackTimer 정책 일치 검증 — Plan E Phase 3.
// vitest 환경이 node (jsdom 없음) + 본 리포는 JSX transform 설정 미적용 →
// 컴포넌트 직접 import 회피하고, 모듈 file 존재성 + resolveRating 일치성 +
// 4 메커니즘 cardStartRef effect dep / deep-recall 미로딩 분기를 소스 정적 검증.
// UI 라이프사이클 (30초 timeout · cleanup · resetKey) 은 e2e 에 위임.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveRating } from "@/lib/core/fsrs/modes";

describe("TimeAttackTimer 컴포넌트 (Plan E Phase 3)", () => {
  it("TimeAttackTimer.tsx 파일 존재", () => {
    const filePath = resolve(__dirname, "TimeAttackTimer.tsx");
    expect(existsSync(filePath)).toBe(true);
  });

  it("DeepRecallEmpty.tsx 파일 존재 — Phase 4 빈 풀 화면", () => {
    const filePath = resolve(__dirname, "DeepRecallEmpty.tsx");
    expect(existsSync(filePath)).toBe(true);
  });
});

// PR #92 Codex round 3 fix — 4 메커니즘 컴포넌트 정적 소스 검증.
//
// 1) cardStartRef 재초기화 dep — `setCards(ordered)` 가 첫 카드를 바꿔도
//    cardStartRef.current 가 재할당되도록 effect dep 에 `card`(또는 `cards`)
//    포함 여부. dep 에 `cardIndex` 만 있으면 time-attack 첫 카드 elapsedMs 가
//    mount 시점 기준으로 흘러 부정확.
// 2) deep-recall 첫 페인트 분기 — `cardsLoaded=false` 시 일반 empty-state 노출
//    회귀 차단. 명시적 `mode === "deep-recall" && !cardsLoaded` early-return 필요.
const MECHANISM_FILES = [
  "QuickQuizComponent.tsx",
  "BlankComponent.tsx",
  "TypingComponent.tsx",
  "WordMatchComponent.tsx",
];

describe("4 메커니즘 cardStartRef 재초기화 dep (Plan E Phase 3, Codex round 3)", () => {
  for (const name of MECHANISM_FILES) {
    it(`${name} — cardStartRef effect dep 에 card 또는 cards 포함`, () => {
      const src = readFileSync(resolve(__dirname, name), "utf8");
      // 정규식: cardStartRef.current 가 할당되는 effect block 의 dep 배열에
      // card / cards 식별자가 등장해야 한다.
      const effectBlocks = src.matchAll(
        /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?cardStartRef\.current\s*=\s*performance\.now\(\)[\s\S]*?\},\s*\[([^\]]*)\]\s*\)/g,
      );
      const deps = [...effectBlocks].map((m) =>
        m[1]!.split(",").map((s) => s.trim()),
      );
      expect(deps.length).toBeGreaterThan(0);
      // 최소 한 개 effect 의 dep 에 card 또는 cards 포함
      const hasCardDep = deps.some((dep) =>
        dep.some((d) => d === "card" || d === "cards" || d === "card?.id"),
      );
      expect(hasCardDep).toBe(true);
    });
  }
});

describe("4 메커니즘 deep-recall 미로딩 첫 페인트 차단 (Plan E Phase 4, Codex round 3)", () => {
  for (const name of MECHANISM_FILES) {
    it(`${name} — mode==="deep-recall" && !cardsLoaded 시 일반 empty-state 차단`, () => {
      const src = readFileSync(resolve(__dirname, name), "utf8");
      // `mode === "deep-recall"` && `!cardsLoaded` 분기 + early return (`null`) 표현
      // 정규식 두 가지 표기 허용 (양방향 비교 또는 공백 변형).
      const hasGuard = /mode\s*===\s*["']deep-recall["']\s*&&\s*!cardsLoaded[\s\S]{0,80}return\s+null/m.test(
        src,
      );
      expect(hasGuard).toBe(true);
    });
  }
});

describe("time-attack rating 정책 (Plan E D1.3 — 30초/카드)", () => {
  it("elapsedMs=30_001 → again — timer expire 와 일치", () => {
    expect(
      resolveRating("time-attack", {
        correct: true,
        wrongCount: 0,
        hintUsed: false,
        elapsedMs: 30_001,
      }),
    ).toBe("again");
  });

  it("elapsedMs=30_000 → good (boundary 비포함)", () => {
    expect(
      resolveRating("time-attack", {
        correct: true,
        wrongCount: 0,
        hintUsed: false,
        elapsedMs: 30_000,
      }),
    ).toBe("good");
  });

  it("elapsedMs=undefined → default — 타이머 미가동 케이스", () => {
    expect(
      resolveRating("time-attack", {
        correct: true,
        wrongCount: 0,
        hintUsed: false,
      }),
    ).toBe("good");
  });

  it("elapsedMs 작아도 wrongCount>=2 → again (default 패턴 보존)", () => {
    expect(
      resolveRating("time-attack", {
        correct: true,
        wrongCount: 2,
        hintUsed: false,
        elapsedMs: 5_000,
      }),
    ).toBe("again");
  });

  it("elapsedMs 30s 초과 + 정답 → again (시간 초과 페널티)", () => {
    expect(
      resolveRating("time-attack", {
        correct: true,
        wrongCount: 0,
        hintUsed: false,
        elapsedMs: 60_000,
      }),
    ).toBe("again");
  });
});
