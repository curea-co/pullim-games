// TimeAttackTimer 정책 일치 검증 — Plan E Phase 3.
// vitest 환경이 node (jsdom 없음) + 본 리포는 JSX transform 설정 미적용 →
// 컴포넌트 직접 import 회피하고, 모듈 file 존재성 + resolveRating 일치성만 검증.
// UI 라이프사이클 (30초 timeout · cleanup · resetKey) 은 e2e 에 위임.

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
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
