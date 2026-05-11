// fingerprint REGRESSION test — SPEC §10.2 강제 항목.
// silent data loss 시나리오 (시크릿 모드, localStorage 거부) 가 silent 가 아니라
// 새 fingerprint 발급으로 graceful degradation 되는지 검증.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFingerprint, resetFingerprint } from "./index";

describe("fingerprint", () => {
  describe("SSR (window 없음)", () => {
    it("window 없으면 null 반환", () => {
      // node 환경 — window 없음
      const original = (globalThis as { window?: unknown }).window;
      delete (globalThis as { window?: unknown }).window;
      try {
        expect(getFingerprint()).toBeNull();
        expect(resetFingerprint()).toBeNull();
      } finally {
        if (original !== undefined) {
          (globalThis as { window?: unknown }).window = original;
        }
      }
    });
  });

  describe("브라우저 환경 (localStorage 정상)", () => {
    let storage: Map<string, string>;

    beforeEach(() => {
      storage = new Map();
      vi.stubGlobal("window", {
        localStorage: {
          getItem: (k: string) => storage.get(k) ?? null,
          setItem: (k: string, v: string) => {
            storage.set(k, v);
          },
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("첫 호출 시 새 UUID 생성·저장", () => {
      const fp = getFingerprint();
      expect(fp).toBeTruthy();
      expect(fp).toMatch(/^[a-z0-9-]+$/);
      expect(storage.get("pullim-games:fingerprint")).toBe(fp);
    });

    it("두 번째 호출 시 같은 fingerprint 반환 (REGRESSION 핵심)", () => {
      const fp1 = getFingerprint();
      const fp2 = getFingerprint();
      expect(fp2).toBe(fp1);
    });

    it("resetFingerprint 후엔 새 fingerprint", () => {
      const fp1 = getFingerprint();
      const fp2 = resetFingerprint();
      expect(fp2).not.toBe(fp1);
      // 다음 getFingerprint 도 reset 된 새 값
      expect(getFingerprint()).toBe(fp2);
    });
  });

  describe("localStorage 거부 — 시크릿 모드 일부 시나리오", () => {
    beforeEach(() => {
      vi.stubGlobal("window", {
        localStorage: {
          getItem: () => {
            throw new Error("SecurityError: localStorage blocked");
          },
          setItem: () => {
            throw new Error("SecurityError");
          },
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("getFingerprint 가 throw 하지 않고 휘발성 fingerprint 반환", () => {
      // SPEC §06 critical gap: silent data loss 차단을 위해 graceful
      let fp: string | null = null;
      expect(() => {
        fp = getFingerprint();
      }).not.toThrow();
      expect(fp).toBeTruthy();
    });
  });
});
