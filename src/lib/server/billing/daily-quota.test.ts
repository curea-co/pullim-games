// 일일 한도 모듈 단위 테스트 — round 10 fix #2.
//
// 검증 항목:
//   - IP 일일 한도(20) 도달 시 거부
//   - 글로벌 일일 cap(80) 도달 시 거부
//   - 60건 도달 시 soft warning 마커 (console.warn 1회)
//   - day key 전환 시 카운터 reset

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkBillingNotifyDailyQuota,
  getBillingNotifyDailyQuotaForTests,
  resetBillingNotifyDailyQuotaForTests,
  RESEND_GLOBAL_DAILY_LIMIT,
  RESEND_GLOBAL_DAILY_WARN_THRESHOLD,
  RESEND_IP_DAILY_LIMIT,
  utcDayKey,
} from "./daily-quota";

beforeEach(() => {
  resetBillingNotifyDailyQuotaForTests();
});

afterEach(() => {
  resetBillingNotifyDailyQuotaForTests();
});

describe("utcDayKey", () => {
  it("UTC 자정 기반 YYYY-MM-DD 포맷", () => {
    // 2026-05-21T00:00:00Z = day key '2026-05-21'.
    const t = Date.UTC(2026, 4, 21, 0, 0, 0);
    expect(utcDayKey(t)).toBe("2026-05-21");
  });

  it("자정 1ms 전과 후 day key 다름", () => {
    const beforeMidnight = Date.UTC(2026, 4, 21, 23, 59, 59, 999);
    const afterMidnight = Date.UTC(2026, 4, 22, 0, 0, 0, 1);
    expect(utcDayKey(beforeMidnight)).toBe("2026-05-21");
    expect(utcDayKey(afterMidnight)).toBe("2026-05-22");
  });
});

describe("checkBillingNotifyDailyQuota — IP 일일 한도", () => {
  it("같은 IP 20건 → 21번째 거부", () => {
    const now = Date.UTC(2026, 4, 21, 12, 0, 0);
    for (let i = 0; i < RESEND_IP_DAILY_LIMIT; i++) {
      const decision = checkBillingNotifyDailyQuota({ ipKey: "1.1.1.1", now });
      expect(decision.allowed).toBe(true);
    }
    const denied = checkBillingNotifyDailyQuota({ ipKey: "1.1.1.1", now });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.reason).toBe("ip_daily_limit");
      expect(denied.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("다른 IP 는 독립 카운트 — 영향 0", () => {
    const now = Date.UTC(2026, 4, 21, 12, 0, 0);
    for (let i = 0; i < RESEND_IP_DAILY_LIMIT; i++) {
      checkBillingNotifyDailyQuota({ ipKey: "1.1.1.1", now });
    }
    // 다른 IP 는 자기 한도 그대로.
    const other = checkBillingNotifyDailyQuota({ ipKey: "2.2.2.2", now });
    expect(other.allowed).toBe(true);
  });

  it("자정 경과 시 IP 카운터 reset", () => {
    const day1 = Date.UTC(2026, 4, 21, 23, 0, 0);
    for (let i = 0; i < RESEND_IP_DAILY_LIMIT; i++) {
      checkBillingNotifyDailyQuota({ ipKey: "1.1.1.1", now: day1 });
    }
    const denied = checkBillingNotifyDailyQuota({ ipKey: "1.1.1.1", now: day1 });
    expect(denied.allowed).toBe(false);

    // 다음 날 — reset.
    const day2 = Date.UTC(2026, 4, 22, 1, 0, 0);
    const allowed = checkBillingNotifyDailyQuota({ ipKey: "1.1.1.1", now: day2 });
    expect(allowed.allowed).toBe(true);
  });
});

describe("checkBillingNotifyDailyQuota — 글로벌 일일 cap", () => {
  it("80건 도달 시 81번째 거부 (다른 IP 라도)", () => {
    const now = Date.UTC(2026, 4, 21, 12, 0, 0);
    // 4개 IP × 20건 = 정확히 80건 (글로벌 cap).
    for (let i = 0; i < 4; i++) {
      const ip = `10.0.0.${i + 1}`;
      for (let j = 0; j < RESEND_IP_DAILY_LIMIT; j++) {
        checkBillingNotifyDailyQuota({ ipKey: ip, now });
      }
    }
    const denied = checkBillingNotifyDailyQuota({ ipKey: "10.0.0.99", now });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.reason).toBe("global_daily_limit");
    }
  });

  it("글로벌 카운터 80 = 80% Resend 무료 한도(100/일)", () => {
    expect(RESEND_GLOBAL_DAILY_LIMIT).toBe(80);
  });
});

describe("checkBillingNotifyDailyQuota — soft warning 마커", () => {
  it("60건 도달 시 console.warn 1회 발생", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const now = Date.UTC(2026, 4, 21, 12, 0, 0);
    // 60건 — 3개 IP × 20건.
    for (let i = 0; i < 3; i++) {
      const ip = `20.0.0.${i + 1}`;
      for (let j = 0; j < RESEND_IP_DAILY_LIMIT; j++) {
        checkBillingNotifyDailyQuota({ ipKey: ip, now });
      }
    }
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [msg, meta] = warnSpy.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(msg).toContain("[billing/notify]");
    expect(meta).toMatchObject({
      marker: "daily_quota_soft_warning",
      globalCount: RESEND_GLOBAL_DAILY_WARN_THRESHOLD,
      cap: RESEND_GLOBAL_DAILY_LIMIT,
    });
    warnSpy.mockRestore();
  });

  it("같은 day 안에서 warning 1회만 — 중복 로깅 없음", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const now = Date.UTC(2026, 4, 21, 12, 0, 0);
    // 60건 도달 + 추가 hit (cap 80 미만이므로 통과).
    for (let i = 0; i < 4; i++) {
      const ip = `30.0.0.${i + 1}`;
      for (let j = 0; j < RESEND_IP_DAILY_LIMIT && i * 20 + j < 70; j++) {
        checkBillingNotifyDailyQuota({ ipKey: ip, now });
      }
    }
    // 글로벌 70건 도달했어도 warn 은 60 임계에서만 1회.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("checkBillingNotifyDailyQuota — store GC", () => {
  it("day key 전환 시 이전 day 카운터 정리", () => {
    const day1 = Date.UTC(2026, 4, 21, 12, 0, 0);
    checkBillingNotifyDailyQuota({ ipKey: "1.2.3.4", now: day1 });
    expect(getBillingNotifyDailyQuotaForTests(day1).ipStoreSize).toBe(1);

    // 다음 날 hit — 이전 day key 가 GC 되어야 한다.
    const day2 = Date.UTC(2026, 4, 22, 12, 0, 0);
    checkBillingNotifyDailyQuota({ ipKey: "5.6.7.8", now: day2 });
    // 이전 day 의 IP key 는 제거되고 새 IP 만 남음.
    expect(getBillingNotifyDailyQuotaForTests(day2).ipStoreSize).toBe(1);
  });
});
