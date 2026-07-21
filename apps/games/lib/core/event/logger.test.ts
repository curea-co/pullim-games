import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logEvent, observeLogEvents } from "./logger";

describe("logEvent", () => {
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
    vi.restoreAllMocks();
  });

  it("sendBeacon 가능 시 sendBeacon 으로 전송", async () => {
    const sendBeacon = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon });

    await logEvent({
      gameId: "factorization",
      cardId: "card-001",
      action: "submit",
    });

    expect(sendBeacon).toHaveBeenCalledOnce();
    const [endpoint, body] = sendBeacon.mock.calls[0]!;
    expect(endpoint).toBe("/api/event");
    expect(body).toBeInstanceOf(Blob);
  });

  it("sendBeacon 없으면 fetch 로 fallback", async () => {
    vi.stubGlobal("navigator", {});
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await logEvent({
      gameId: "factorization",
      cardId: null,
      action: "session-start",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/event");
  });

  it("fetch throw 해도 silent (게임 진행 보호)", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    // throw 안 함
    await expect(
      logEvent({
        gameId: "x",
        cardId: null,
        action: "abandon",
      }),
    ).resolves.toBeUndefined();
  });

  it("SSR (window 없음) → no-op (fingerprint null)", async () => {
    const original = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      await logEvent({
        gameId: "x",
        cardId: null,
        action: "submit",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (original !== undefined) {
        (globalThis as { window?: unknown }).window = original;
      }
    }
  });

  it("observer에 실제 전송과 같은 timestamp를 알리고 cleanup 후 중단", async () => {
    vi.stubGlobal("navigator", {});
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now").mockReturnValue(1_784_560_050_000);
    const observer = vi.fn();
    const stop = observeLogEvents(observer);

    const input = {
      gameId: "factorization",
      cardId: "card-001",
      action: "submit" as const,
    };
    await logEvent(input);

    expect(observer).toHaveBeenCalledWith({
      input,
      timestampMs: 1_784_560_050_000,
    });
    const request = JSON.parse(
      fetchMock.mock.calls[0]![1]!.body as string,
    ) as { timestampMs: number };
    expect(request.timestampMs).toBe(1_784_560_050_000);

    stop();
    await logEvent(input);
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it("observer throw/reject가 기존 logger 전송을 막지 않음", async () => {
    vi.stubGlobal("navigator", {});
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const stopThrowing = observeLogEvents(() => {
      throw new Error("observer failed");
    });
    const stopRejecting = observeLogEvents(async () => {
      throw new Error("observer rejected");
    });

    await expect(
      logEvent({
        gameId: "factorization",
        cardId: null,
        action: "session-start",
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();

    stopThrowing();
    stopRejecting();
  });
});
