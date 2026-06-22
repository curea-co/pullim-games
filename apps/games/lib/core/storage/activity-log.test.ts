import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearActivity,
  loadActivity,
  loadActivityForGames,
  recordGameActivity,
  toDateBucket,
} from "./activity-log";

describe("activity-log — toDateBucket (로컬 자정 기준)", () => {
  it("YYYY-MM-DD 포맷", () => {
    expect(toDateBucket(new Date(2026, 4, 18, 9, 30))).toBe("2026-05-18");
    expect(toDateBucket(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
  });
});

describe("activity-log — recordActivity / loadActivity", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        get length() {
          return store.size;
        },
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("빈 storage → 모든 bucket count=0", () => {
    const result = loadActivity("vocab-typing", 7, new Date(2026, 4, 18));
    expect(result.length).toBe(7);
    expect(result.every((r) => r.count === 0)).toBe(true);
    expect(result[6]?.date).toBe("2026-05-18"); // 오늘이 마지막
  });

  it("recordActivity 1회 → 오늘 bucket count=1", () => {
    const now = new Date(2026, 4, 18, 9, 30);
    recordGameActivity("vocab-typing", now);
    const result = loadActivity("vocab-typing", 3, now);
    expect(result[2]).toEqual({ date: "2026-05-18", count: 1 });
    expect(result[1]).toEqual({ date: "2026-05-17", count: 0 });
  });

  it("recordActivity 같은 날 여러 번 → 누적", () => {
    const now = new Date(2026, 4, 18, 9, 30);
    recordGameActivity("vocab-typing", now);
    recordGameActivity("vocab-typing", now);
    recordGameActivity("vocab-typing", now);
    const result = loadActivity("vocab-typing", 1, now);
    expect(result[0]).toEqual({ date: "2026-05-18", count: 3 });
  });

  it("다른 날짜 → 별 bucket", () => {
    recordGameActivity("vocab-typing", new Date(2026, 4, 16, 10, 0));
    recordGameActivity("vocab-typing", new Date(2026, 4, 17, 11, 0));
    recordGameActivity("vocab-typing", new Date(2026, 4, 18, 12, 0));
    recordGameActivity("vocab-typing", new Date(2026, 4, 18, 13, 0));
    const result = loadActivity("vocab-typing", 3, new Date(2026, 4, 18, 14, 0));
    expect(result[0]).toEqual({ date: "2026-05-16", count: 1 });
    expect(result[1]).toEqual({ date: "2026-05-17", count: 1 });
    expect(result[2]).toEqual({ date: "2026-05-18", count: 2 });
  });

  it("14일 retention — 15일 전 활동은 prune", () => {
    const now = new Date(2026, 4, 18, 12, 0);
    const fifteenDaysAgo = new Date(2026, 4, 3, 12, 0); // 15일 전
    const tenDaysAgo = new Date(2026, 4, 8, 12, 0); // 10일 전
    recordGameActivity("vocab-typing", fifteenDaysAgo);
    recordGameActivity("vocab-typing", tenDaysAgo);
    // 새 record 가 prune 트리거
    recordGameActivity("vocab-typing", now);

    const result = loadActivity("vocab-typing", 14, now);
    // 14일 전 (2026-05-05) ~ 오늘 (2026-05-18). 2026-05-03 은 cutoff 밖.
    const found0503 = result.find((r) => r.date === "2026-05-03");
    expect(found0503).toBeUndefined();
    const found0508 = result.find((r) => r.date === "2026-05-08");
    expect(found0508?.count).toBe(1);
    const found0518 = result.find((r) => r.date === "2026-05-18");
    expect(found0518?.count).toBe(1);
  });

  it("multi-game — gameId 별 분리", () => {
    const now = new Date(2026, 4, 18, 9, 30);
    recordGameActivity("vocab-typing", now);
    recordGameActivity("factorization", now);
    recordGameActivity("factorization", now);
    const vt = loadActivity("vocab-typing", 1, now);
    const fc = loadActivity("factorization", 1, now);
    expect(vt[0]?.count).toBe(1);
    expect(fc[0]?.count).toBe(2);
  });

  it("loadActivityForGames — Map 으로 일괄 로드", () => {
    const now = new Date(2026, 4, 18, 9, 30);
    recordGameActivity("vocab-typing", now);
    recordGameActivity("factorization", now);
    const map = loadActivityForGames(
      ["vocab-typing", "factorization", "math-quick-quiz"],
      3,
      now,
    );
    expect(map.size).toBe(3);
    expect(map.get("vocab-typing")?.[2]?.count).toBe(1);
    expect(map.get("factorization")?.[2]?.count).toBe(1);
    expect(map.get("math-quick-quiz")?.[2]?.count).toBe(0);
  });

  it("손상된 JSON → 빈 map fallback (silent)", () => {
    store.set("pullim-games:activity-log:vocab-typing", "not-json{");
    const result = loadActivity("vocab-typing", 3, new Date(2026, 4, 18));
    expect(result.every((r) => r.count === 0)).toBe(true);
  });

  it("clearActivity — gameId 단위 클리어", () => {
    const now = new Date(2026, 4, 18, 9, 30);
    recordGameActivity("vocab-typing", now);
    recordGameActivity("factorization", now);
    clearActivity("vocab-typing");
    expect(loadActivity("vocab-typing", 1, now)[0]?.count).toBe(0);
    expect(loadActivity("factorization", 1, now)[0]?.count).toBe(1);
  });
});

describe("activity-log — SSR (window 없음)", () => {
  it("loadActivity → 모든 count=0 반환, throw X", () => {
    const original = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    try {
      const result = loadActivity("vocab-typing", 3, new Date(2026, 4, 18));
      expect(result.length).toBe(3);
      expect(result.every((r) => r.count === 0)).toBe(true);
    } finally {
      if (original !== undefined) {
        (globalThis as { window?: unknown }).window = original;
      }
    }
  });
});
