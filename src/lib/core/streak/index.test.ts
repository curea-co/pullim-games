import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  createInitialStreak,
  recordActivity,
  loadStreak,
  saveStreak,
  recordActivityAndSave,
} from "./index";

describe("recordActivity (순수 함수)", () => {
  const empty = createInitialStreak();

  it("첫 활동 — prev 없음 → current 1, longest 1", () => {
    const next = recordActivity(empty, new Date(2026, 4, 15, 10));
    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
    expect(next.lastActiveDate).toBe("2026-05-15");
  });

  it("오늘 이미 기록됨 — no-op", () => {
    const prev = { current: 5, longest: 7, lastActiveDate: "2026-05-15" };
    const next = recordActivity(prev, new Date(2026, 4, 15, 23, 59));
    expect(next).toEqual(prev);
  });

  it("어제 → 오늘 — current +1", () => {
    const prev = { current: 3, longest: 5, lastActiveDate: "2026-05-14" };
    const next = recordActivity(prev, new Date(2026, 4, 15, 9));
    expect(next.current).toBe(4);
    expect(next.longest).toBe(5);
    expect(next.lastActiveDate).toBe("2026-05-15");
  });

  it("어제 → 오늘 — current 가 longest 초과 시 longest 갱신", () => {
    const prev = { current: 7, longest: 7, lastActiveDate: "2026-05-14" };
    const next = recordActivity(prev, new Date(2026, 4, 15, 9));
    expect(next.current).toBe(8);
    expect(next.longest).toBe(8);
  });

  it("이틀 빠짐 — current 1 리셋, longest 보존", () => {
    const prev = { current: 10, longest: 10, lastActiveDate: "2026-05-13" };
    const next = recordActivity(prev, new Date(2026, 4, 15, 9));
    expect(next.current).toBe(1);
    expect(next.longest).toBe(10);
    expect(next.lastActiveDate).toBe("2026-05-15");
  });

  it("일주일+ 빠짐 — current 1 리셋, longest 보존", () => {
    const prev = { current: 30, longest: 30, lastActiveDate: "2026-05-01" };
    const next = recordActivity(prev, new Date(2026, 4, 15, 9));
    expect(next.current).toBe(1);
    expect(next.longest).toBe(30);
  });

  it("월 경계 (4월 30 → 5월 1) — current +1", () => {
    const prev = { current: 4, longest: 4, lastActiveDate: "2026-04-30" };
    const next = recordActivity(prev, new Date(2026, 4, 1, 12));
    expect(next.current).toBe(5);
    expect(next.longest).toBe(5);
    expect(next.lastActiveDate).toBe("2026-05-01");
  });

  it("연 경계 (12월 31 → 1월 1) — current +1", () => {
    const prev = { current: 364, longest: 364, lastActiveDate: "2025-12-31" };
    const next = recordActivity(prev, new Date(2026, 0, 1, 0, 30));
    expect(next.current).toBe(365);
    expect(next.longest).toBe(365);
    expect(next.lastActiveDate).toBe("2026-01-01");
  });
});

describe("loadStreak / saveStreak (localStorage)", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("window", {
      localStorage: {
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

  it("초기 로드 — empty state", () => {
    expect(loadStreak()).toEqual(createInitialStreak());
  });

  it("save → load round-trip", () => {
    const s = { current: 12, longest: 30, lastActiveDate: "2026-05-15" };
    saveStreak(s);
    expect(loadStreak()).toEqual(s);
  });

  it("recordActivityAndSave — 첫 활동", () => {
    const next = recordActivityAndSave(new Date(2026, 4, 15, 10));
    expect(next.current).toBe(1);
    expect(loadStreak()).toEqual(next);
  });

  it("recordActivityAndSave — 어제 기록 후 오늘 호출 시 +1 + 영속화", () => {
    saveStreak({ current: 2, longest: 4, lastActiveDate: "2026-05-14" });
    const next = recordActivityAndSave(new Date(2026, 4, 15, 9));
    expect(next.current).toBe(3);
    expect(next.longest).toBe(4);
    expect(loadStreak().current).toBe(3);
  });

  it("malformed JSON → empty state fallback", () => {
    store.set("pullim-games:streak", "not-json");
    expect(loadStreak()).toEqual(createInitialStreak());
  });
});
