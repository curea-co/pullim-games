// CSRF nonce 모듈 단위 테스트 — round 10 fix #1.
//
// 검증 항목:
//   - 토큰 발급·검증·1회 소비·만료 분기
//   - 쿠키 헤더 파싱
//   - hex 형식 검증

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BILLING_NOTIFY_CSRF_COOKIE,
  getBillingNotifyCsrfStoreSizeForTests,
  issueBillingNotifyCsrfToken,
  readBillingNotifyCsrfToken,
  resetBillingNotifyCsrfStoreForTests,
  verifyBillingNotifyCsrfToken,
} from "./csrf";

beforeEach(() => {
  resetBillingNotifyCsrfStoreForTests();
});

afterEach(() => {
  resetBillingNotifyCsrfStoreForTests();
});

describe("issueBillingNotifyCsrfToken", () => {
  it("토큰은 hex 64자 — 32 byte random", () => {
    const issued = issueBillingNotifyCsrfToken();
    expect(issued.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("쿠키 헤더에 핵심 속성 포함 (Path·HttpOnly·SameSite=Strict·Max-Age)", () => {
    const issued = issueBillingNotifyCsrfToken({ isProduction: false });
    expect(issued.cookieHeader).toContain(BILLING_NOTIFY_CSRF_COOKIE);
    expect(issued.cookieHeader).toContain("Path=/api/billing/notify");
    expect(issued.cookieHeader).toContain("HttpOnly");
    expect(issued.cookieHeader).toContain("SameSite=Strict");
    expect(issued.cookieHeader).toContain("Max-Age=3600");
    expect(issued.cookieHeader).not.toContain("Secure");
  });

  it("production 모드에서는 Secure 플래그 부착", () => {
    const issued = issueBillingNotifyCsrfToken({ isProduction: true });
    expect(issued.cookieHeader).toContain("Secure");
  });

  it("매 호출마다 다른 토큰 — collision 확률 0 (32 byte random)", () => {
    const a = issueBillingNotifyCsrfToken().token;
    const b = issueBillingNotifyCsrfToken().token;
    expect(a).not.toBe(b);
  });
});

describe("verifyBillingNotifyCsrfToken", () => {
  it("발급된 토큰은 valid — 통과 + 1회 소비", () => {
    const issued = issueBillingNotifyCsrfToken();
    expect(verifyBillingNotifyCsrfToken(issued.token)).toBe("valid");
    // 두번째 호출은 invalid — store 에서 소비됨.
    expect(verifyBillingNotifyCsrfToken(issued.token)).toBe("invalid");
  });

  it("consume=false 일 때는 소비되지 않음", () => {
    const issued = issueBillingNotifyCsrfToken();
    expect(
      verifyBillingNotifyCsrfToken(issued.token, { consume: false }),
    ).toBe("valid");
    // 같은 토큰 재호출도 valid (소비 안 됨).
    expect(verifyBillingNotifyCsrfToken(issued.token)).toBe("valid");
  });

  it("null·빈 문자열 → missing", () => {
    expect(verifyBillingNotifyCsrfToken(null)).toBe("missing");
    expect(verifyBillingNotifyCsrfToken("")).toBe("missing");
    expect(verifyBillingNotifyCsrfToken(undefined)).toBe("missing");
  });

  it("store 에 없는 토큰 → invalid", () => {
    expect(verifyBillingNotifyCsrfToken("a".repeat(64))).toBe("invalid");
  });

  it("만료된 토큰 → expired + store 에서 즉시 제거", () => {
    const issuedAt = 1_700_000_000_000;
    const issued = issueBillingNotifyCsrfToken({ now: issuedAt });
    const sizeBefore = getBillingNotifyCsrfStoreSizeForTests();
    expect(sizeBefore).toBe(1);
    // 2시간 뒤 시각으로 검증.
    expect(
      verifyBillingNotifyCsrfToken(issued.token, {
        now: issuedAt + 2 * 60 * 60_000,
      }),
    ).toBe("expired");
    // 만료된 토큰은 store 에서 즉시 제거.
    expect(getBillingNotifyCsrfStoreSizeForTests()).toBe(0);
  });
});

describe("readBillingNotifyCsrfToken", () => {
  it("쿠키 헤더에서 토큰 추출", () => {
    const issued = issueBillingNotifyCsrfToken();
    const header = `${BILLING_NOTIFY_CSRF_COOKIE}=${issued.token}; other=foo`;
    expect(readBillingNotifyCsrfToken(header)).toBe(issued.token);
  });

  it("쿠키 헤더에 다른 쿠키만 있으면 null", () => {
    expect(readBillingNotifyCsrfToken("session=abc; foo=bar")).toBeNull();
  });

  it("빈 문자열·null·undefined → null", () => {
    expect(readBillingNotifyCsrfToken("")).toBeNull();
    expect(readBillingNotifyCsrfToken(null)).toBeNull();
    expect(readBillingNotifyCsrfToken(undefined)).toBeNull();
  });

  it("쿠키 값이 비어있으면 null", () => {
    expect(readBillingNotifyCsrfToken(`${BILLING_NOTIFY_CSRF_COOKIE}=`)).toBeNull();
  });
});
