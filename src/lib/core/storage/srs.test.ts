import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllSrsStates,
  loadAllSrsStates,
  loadSrsState,
  saveSrsState,
} from "./srs";
import { createInitialState, reviewCard } from "@/lib/core/fsrs";

describe("SRS storage", () => {
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

  it("load 시 빈 storage → 초기 상태", () => {
    const s = loadSrsState("factorization", "card-001");
    expect(s.reviewCount).toBe(0);
    expect(s.lastReviewAt).toBeNull();
  });

  it("save → load 라운드트립", () => {
    const initial = createInitialState();
    const reviewed = reviewCard(initial, "good");
    saveSrsState("factorization", "card-001", reviewed);

    const loaded = loadSrsState("factorization", "card-001");
    expect(loaded.reviewCount).toBe(1);
    expect(loaded.lastReviewAt).toBeInstanceOf(Date);
    expect(loaded.fsrsCard.due).toBeInstanceOf(Date);
  });

  it("loadAllSrsStates — gameId 별 모든 카드", () => {
    saveSrsState("factorization", "card-001", reviewCard(createInitialState(), "good"));
    saveSrsState("factorization", "card-002", reviewCard(createInitialState(), "easy"));
    saveSrsState("english-order", "card-001", reviewCard(createInitialState(), "good"));

    const states = loadAllSrsStates("factorization");
    expect(states.size).toBe(2);
    expect(states.has("card-001")).toBe(true);
    expect(states.has("card-002")).toBe(true);
    expect(states.has("card-x")).toBe(false);
  });

  it("clearAllSrsStates — gameId 단위 클리어", () => {
    saveSrsState("factorization", "card-001", createInitialState());
    saveSrsState("english-order", "card-001", createInitialState());

    clearAllSrsStates("factorization");

    expect(loadAllSrsStates("factorization").size).toBe(0);
    expect(loadAllSrsStates("english-order").size).toBe(1);
  });

  it("손상된 JSON → 초기 상태 (silent fallback)", () => {
    store.set("pullim-games:srs:factorization:card-001", "not-json{");
    const s = loadSrsState("factorization", "card-001");
    expect(s.reviewCount).toBe(0);
  });
});

describe("SRS storage — SSR (window 없음)", () => {
  it("loadSrsState → 초기 상태 반환, throw 안 함", () => {
    const original = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    try {
      const s = loadSrsState("g", "c");
      expect(s.reviewCount).toBe(0);
    } finally {
      if (original !== undefined) {
        (globalThis as { window?: unknown }).window = original;
      }
    }
  });
});
