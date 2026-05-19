// mode wrapper test — plan §3 Phase 1 검증.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAndPersist,
  applyReview,
  resolveRating,
  type ReviewOutcome,
} from "./index";
import { createInitialState } from "@/lib/core/fsrs";

const defaultOutcome = (over: Partial<ReviewOutcome> = {}): ReviewOutcome => ({
  correct: true,
  wrongCount: 0,
  hintUsed: false,
  ...over,
});

describe("resolveRating — default 모드", () => {
  it("첫 시도 정답 + 힌트 미사용 → good", () => {
    expect(resolveRating("default", defaultOutcome())).toBe("good");
  });

  it("힌트 사용한 정답 → hard (wrongCount 무관)", () => {
    expect(
      resolveRating("default", defaultOutcome({ hintUsed: true })),
    ).toBe("hard");
    expect(
      resolveRating(
        "default",
        defaultOutcome({ hintUsed: true, wrongCount: 1 }),
      ),
    ).toBe("hard");
  });

  it("wrongCount === 1 + 정답 → hard", () => {
    expect(
      resolveRating("default", defaultOutcome({ wrongCount: 1 })),
    ).toBe("hard");
  });

  it("wrongCount >= 2 + 정답 → again", () => {
    expect(
      resolveRating("default", defaultOutcome({ wrongCount: 2 })),
    ).toBe("again");
    expect(
      resolveRating("default", defaultOutcome({ wrongCount: 5 })),
    ).toBe("again");
  });

  it("오답 (reveal 트리거) → again", () => {
    expect(
      resolveRating("default", defaultOutcome({ correct: false })),
    ).toBe("again");
    expect(
      resolveRating(
        "default",
        defaultOutcome({ correct: false, wrongCount: 5 }),
      ),
    ).toBe("again");
  });

  it("elapsedMs 는 default 모드에서 무시 (good 유지)", () => {
    expect(
      resolveRating("default", defaultOutcome({ elapsedMs: 5_000 })),
    ).toBe("good");
  });
});

describe("resolveRating — review-queue (Plan E Phase 2)", () => {
  it("rating 결정 default 와 동일 — 카드 선택만 차이", () => {
    expect(resolveRating("review-queue", defaultOutcome())).toBe("good");
    expect(
      resolveRating("review-queue", defaultOutcome({ correct: false })),
    ).toBe("again");
    expect(
      resolveRating("review-queue", defaultOutcome({ wrongCount: 1 })),
    ).toBe("hard");
  });
});

describe("resolveRating — deep-recall (Plan E Phase 4)", () => {
  it("rating 결정 default 와 동일 — R<0.6 카드만 풀로 차이", () => {
    expect(resolveRating("deep-recall", defaultOutcome())).toBe("good");
    expect(
      resolveRating("deep-recall", defaultOutcome({ hintUsed: true })),
    ).toBe("hard");
  });
});

describe("resolveRating — time-attack (Plan E Phase 3)", () => {
  it("elapsedMs 30초 이내 정답 → default 패턴", () => {
    expect(
      resolveRating("time-attack", defaultOutcome({ elapsedMs: 15_000 })),
    ).toBe("good");
    expect(
      resolveRating(
        "time-attack",
        defaultOutcome({ elapsedMs: 25_000, wrongCount: 1 }),
      ),
    ).toBe("hard");
  });

  it("elapsedMs 30초 초과 → again (시간 초과 페널티)", () => {
    expect(
      resolveRating("time-attack", defaultOutcome({ elapsedMs: 30_001 })),
    ).toBe("again");
    expect(
      resolveRating("time-attack", defaultOutcome({ elapsedMs: 60_000 })),
    ).toBe("again");
  });

  it("elapsedMs 미정의 → default (타이머 미가동 케이스)", () => {
    expect(resolveRating("time-attack", defaultOutcome())).toBe("good");
  });
});

describe("applyReview — 순수성", () => {
  it("prev mutate X — 새 객체 반환", () => {
    const prev = createInitialState(new Date("2026-05-18T00:00:00Z"));
    const snapshot = JSON.stringify(prev);
    const next = applyReview("default", prev, defaultOutcome());
    expect(JSON.stringify(prev)).toBe(snapshot);
    expect(next).not.toBe(prev);
    expect(next.reviewCount).toBe(1);
  });

  it("정답 + 오답 응답이 다른 SRS 상태 산정 (due 차이)", () => {
    const prev = createInitialState(new Date("2026-05-18T00:00:00Z"));
    const now = new Date("2026-05-18T00:01:00Z");
    const correct = applyReview("default", prev, defaultOutcome(), now);
    const wrong = applyReview(
      "default",
      prev,
      defaultOutcome({ correct: false }),
      now,
    );
    expect(correct.fsrsCard.due.getTime()).not.toBe(
      wrong.fsrsCard.due.getTime(),
    );
  });
});

describe("applyAndPersist — load·apply·save round-trip", () => {
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

  it("첫 응답 — 신규 카드 → reviewCount 1 + localStorage 영속화", () => {
    const next = applyAndPersist(
      "default",
      "factorization",
      "card-001",
      defaultOutcome(),
    );
    expect(next.reviewCount).toBe(1);
    // localStorage 에 SRS 키 저장됐는지
    expect(store.has("pullim-games:srs:factorization:card-001")).toBe(true);
    // streak 도 동거 wrapper (saveSrsAndRecord)로 갱신됐는지
    expect(store.has("pullim-games:streak")).toBe(true);
  });

  it("두 번째 응답 — 누적 reviewCount=2", () => {
    applyAndPersist(
      "default",
      "factorization",
      "card-001",
      defaultOutcome(),
    );
    const second = applyAndPersist(
      "default",
      "factorization",
      "card-001",
      defaultOutcome(),
    );
    expect(second.reviewCount).toBe(2);
  });

  it("오답 시 again rating 적용 — 정답과 다른 due", () => {
    const correct = applyAndPersist(
      "default",
      "factorization",
      "card-a",
      defaultOutcome(),
    );
    const wrong = applyAndPersist(
      "default",
      "factorization",
      "card-b",
      defaultOutcome({ correct: false }),
    );
    expect(correct.fsrsCard.due.getTime()).not.toBe(
      wrong.fsrsCard.due.getTime(),
    );
  });
});
