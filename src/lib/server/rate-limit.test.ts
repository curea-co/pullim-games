// rate-limit 단위 테스트.
// SPEC §05.7.5 외부 메일 서비스 위임 정책 — abuse 방어 1차 가드.

import { afterEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  checkRateLimits,
  extractClientIp,
  resetRateLimitForTests,
} from "./rate-limit";

afterEach(() => {
  resetRateLimitForTests();
});

describe("checkRateLimit — 단일 rule sliding window", () => {
  it("max 까지 허용, 초과 시 거부", () => {
    const rule = { key: "ip:1.1.1.1", windowMs: 60_000, max: 3 };
    const now = 1_000_000;
    for (let i = 1; i <= 3; i++) {
      const d = checkRateLimit(rule, now);
      expect(d.allowed).toBe(true);
      expect(d.count).toBe(i);
    }
    const denied = checkRateLimit(rule, now);
    expect(denied.allowed).toBe(false);
    expect(denied.count).toBe(3);
    expect(denied.retryAfterMs).toBe(60_000);
  });

  it("window 만료 후 다시 허용", () => {
    const rule = { key: "ip:2.2.2.2", windowMs: 1_000, max: 2 };
    const t0 = 5_000;
    checkRateLimit(rule, t0); // 1
    checkRateLimit(rule, t0); // 2
    expect(checkRateLimit(rule, t0).allowed).toBe(false); // 3 → denied
    // window 만료 시점.
    const t1 = t0 + 1_100;
    expect(checkRateLimit(rule, t1).allowed).toBe(true);
  });

  it("key 가 비어있으면 즉시 거부 (식별 불가 안전 default)", () => {
    const rule = { key: "", windowMs: 60_000, max: 5 };
    const d = checkRateLimit(rule);
    expect(d.allowed).toBe(false);
  });

  it("retryAfterMs — 가장 오래된 stamp 만료 시점까지 ms 정확히 계산", () => {
    const rule = { key: "ip:3.3.3.3", windowMs: 10_000, max: 2 };
    const t0 = 100_000;
    checkRateLimit(rule, t0);
    checkRateLimit(rule, t0 + 3_000);
    const denied = checkRateLimit(rule, t0 + 4_000);
    expect(denied.allowed).toBe(false);
    // 첫 stamp 가 t0+10_000 에 만료 → t0+4_000 시점 기준 6_000ms 대기.
    expect(denied.retryAfterMs).toBe(6_000);
  });

  it("key 별 독립 카운트", () => {
    const a = { key: "ip:A", windowMs: 60_000, max: 1 };
    const b = { key: "ip:B", windowMs: 60_000, max: 1 };
    expect(checkRateLimit(a).allowed).toBe(true);
    expect(checkRateLimit(b).allowed).toBe(true);
    expect(checkRateLimit(a).allowed).toBe(false);
    expect(checkRateLimit(b).allowed).toBe(false);
  });
});

describe("checkRateLimits — 다중 rule (AND)", () => {
  it("두 rule 동시 hit. 좁은 rule 이 먼저 cap → 거부", () => {
    const now = 1_000_000;
    const key = "ip:multi";
    const rules = [
      { key, windowMs: 60_000, max: 2 }, // 1분 2회
      { key, windowMs: 60 * 60_000, max: 5 }, // 1시간 5회
    ];
    expect(checkRateLimits(rules, now).allowed).toBe(true); // 1
    expect(checkRateLimits(rules, now).allowed).toBe(true); // 2
    // 3 번째: 좁은 rule cap (1분 2회) — 거부.
    expect(checkRateLimits(rules, now).allowed).toBe(false);
  });

  it("좁은 rule window 만료 후에도 넓은 rule cap 으로 차단 — 시간 분산 abuse 방어", () => {
    const key = "ip:burst";
    const rules = [
      { key, windowMs: 1_000, max: 2 }, // 1초 2회
      { key, windowMs: 10_000, max: 3 }, // 10초 3회
    ];
    const t0 = 1_000_000;
    checkRateLimits(rules, t0); // 1
    checkRateLimits(rules, t0); // 2
    // 1초 후 — 좁은 rule reset. 넓은 rule 은 2 누적.
    checkRateLimits(rules, t0 + 1_500); // 3 (넓은 rule cap 3 — 도달)
    // 1.6초 — 넓은 rule cap 으로 거부.
    expect(checkRateLimits(rules, t0 + 1_600).allowed).toBe(false);
  });
});

describe("extractClientIp", () => {
  it("x-forwarded-for 우선 (첫 IP)", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(extractClientIp(h)).toBe("1.2.3.4");
  });

  it("x-real-ip fallback", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(extractClientIp(h)).toBe("9.9.9.9");
  });

  it("cf-connecting-ip fallback", () => {
    const h = new Headers({ "cf-connecting-ip": "8.8.8.8" });
    expect(extractClientIp(h)).toBe("8.8.8.8");
  });

  it("아무 헤더 없으면 빈 문자열", () => {
    expect(extractClientIp(new Headers())).toBe("");
  });

  it("x-forwarded-for 공백 trim", () => {
    const h = new Headers({ "x-forwarded-for": "  10.0.0.1  " });
    expect(extractClientIp(h)).toBe("10.0.0.1");
  });
});
