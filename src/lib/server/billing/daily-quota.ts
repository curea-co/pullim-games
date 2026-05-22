// /api/billing/notify 일일 한도 — Resend 무료 한도(100/일) 정합.
// SPEC §05.7.5 외부 메일 서비스 위임 정책 + round 10 fix (Codex 지적 #2).
//
// 정책 배경 (round 10 — Codex 지적 #2):
// - 기존 IP 한도(30/분·100/시간)는 amortized 시 같은 NAT 가 하루 2400 건 가능 →
//   Resend 무료 한도(100/일)의 24배 → 단일 IP 가 무료 quota 를 1시간 안에 전부 소진해
//   알림 수집 기능이 하루 종일 마비될 수 있음.
// - 추가 가드: **IP 일일 한도 20/일** + **글로벌 일일 cap 80/일** (Resend 무료의 80%).
//   IP 일일 한도: 단일 IP 가 무료 한도의 20% 만 소진 가능. 학교 NAT 100명 × 4명 동의
//   = 400/일 시나리오에서도 한 IP 가 20건 까지만 통과 → 5개 IP 분산 시 100건 정상 처리.
// - 60/일 도달 시 console.warn 마커 — 운영 측이 quota soft-warning 단계에서 인지.
//
// 모델:
// - Sliding 24h window 가 아닌 UTC 일자 기반 day key 사용 (월 경계 단순성·예측가능성).
//   `YYYY-MM-DD` (UTC) 를 day key 로 구성해 자정마다 자동 reset. KST 기준 자정 != UTC
//   자정이지만 cap 자체가 soft guard 라 UTC 단순성을 택한다 (Resend dashboard 도 UTC
//   기반).
// - IP 일일: Map<`ip|YYYY-MM-DD`, count>. 일자 바뀌면 새 key → 이전 day key 는 GC.
// - 글로벌 일일: Map<`YYYY-MM-DD`, count>.
//
// V2 진화:
// - 분산 환경에서는 cold start 마다 카운터 리셋되므로 정밀 cap 보장 X — KV/Redis
//   기반 카운터로 재설계 (SPEC §05.7.5 진화 노트).

/**
 * IP 일일 한도. Resend 무료 한도(100/일) 의 20% 로 cap.
 * 단일 IP·NAT 가 quota 를 빠르게 소진하지 못하도록 제한.
 */
export const RESEND_IP_DAILY_LIMIT = 20;

/**
 * 글로벌 일일 cap. Resend 무료 한도(100/일) 의 80% — 20% 안전 마진.
 * 80% 도달 시 라우트 자체가 fail-closed (429) → quota 0 도달 방지.
 */
export const RESEND_GLOBAL_DAILY_LIMIT = 80;

/**
 * Soft warning 임계 — 글로벌 일일 카운트가 이 값에 도달하면 console.warn 마커.
 * 운영 측이 quota 도달 전 단계에서 인지 가능.
 */
export const RESEND_GLOBAL_DAILY_WARN_THRESHOLD = 60;

const ipDailyStore = new Map<string, number>();
const globalDailyStore = new Map<string, number>();

/** 가장 최근 warn 로그를 낸 day key — 중복 로깅 방지. */
let lastWarnedDayKey: string | null = null;

/** UTC YYYY-MM-DD day key. 자정마다 자동 변경 → 카운터 reset. */
export function utcDayKey(now: number = Date.now()): string {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DailyQuotaOutcome =
  | { allowed: true; ipCount: number; globalCount: number }
  | {
      allowed: false;
      reason: "ip_daily_limit" | "global_daily_limit";
      ipCount: number;
      globalCount: number;
      /** 다음 UTC 자정까지 남은 ms — Retry-After 헤더 계산용. */
      retryAfterMs: number;
    };

/**
 * IP·글로벌 일일 카운터 hit. 둘 다 통과해야 허용.
 *
 * 동작 순서:
 *   1. 두 카운터 동시 peek (mutation 0).
 *   2. 어느 하나라도 초과면 거부 — 어느 쪽도 증가시키지 않음.
 *   3. 모두 통과면 두 카운터 모두 +1.
 *
 * `ipKey` 가 빈 문자열이면 IP 식별 불가 — 함수가 거부하지 않고 글로벌만 검사.
 * (라우트 측이 fail-closed 분기를 별도 처리 — 본 함수는 quota guard 만 담당.)
 */
export interface CheckDailyQuotaOptions {
  /** 클라이언트 IP key (route 측이 resolveRateLimitKey 로 dev fallback 까지 적용). */
  ipKey: string;
  /** 현재 시각 ms. 테스트 주입용. */
  now?: number;
}

export function checkBillingNotifyDailyQuota(
  opts: CheckDailyQuotaOptions,
): DailyQuotaOutcome {
  const now = opts.now ?? Date.now();
  const dayKey = utcDayKey(now);

  // ── GC: 이전 day key 잔존 정리 (메모리 누수 차단) ─────────────────────
  gcStaleDayKeys(dayKey);

  const ipDayKey = opts.ipKey ? `${opts.ipKey}|${dayKey}` : "";
  const currentIp = ipDayKey ? (ipDailyStore.get(ipDayKey) ?? 0) : 0;
  const currentGlobal = globalDailyStore.get(dayKey) ?? 0;

  const retryAfterMs = msUntilNextUtcMidnight(now);

  // ── peek: IP 일일 초과? ───────────────────────────────────────────────
  if (ipDayKey && currentIp >= RESEND_IP_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "ip_daily_limit",
      ipCount: currentIp,
      globalCount: currentGlobal,
      retryAfterMs,
    };
  }

  // ── peek: 글로벌 일일 cap 초과? ───────────────────────────────────────
  if (currentGlobal >= RESEND_GLOBAL_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "global_daily_limit",
      ipCount: currentIp,
      globalCount: currentGlobal,
      retryAfterMs,
    };
  }

  // ── commit: 두 카운터 모두 +1 ─────────────────────────────────────────
  const nextGlobal = currentGlobal + 1;
  globalDailyStore.set(dayKey, nextGlobal);
  if (ipDayKey) {
    ipDailyStore.set(ipDayKey, currentIp + 1);
  }

  // ── soft warning 마커 — 60/일 도달 시 1회 console.warn ──────────────
  if (
    nextGlobal === RESEND_GLOBAL_DAILY_WARN_THRESHOLD &&
    lastWarnedDayKey !== dayKey
  ) {
    lastWarnedDayKey = dayKey;
    console.warn("[billing/notify] daily quota soft-warning", {
      marker: "daily_quota_soft_warning",
      dayKey,
      globalCount: nextGlobal,
      cap: RESEND_GLOBAL_DAILY_LIMIT,
      warnThreshold: RESEND_GLOBAL_DAILY_WARN_THRESHOLD,
    });
  }

  return {
    allowed: true,
    ipCount: ipDayKey ? currentIp + 1 : 0,
    globalCount: nextGlobal,
  };
}

/** 다음 UTC 자정까지 남은 ms. cap 도달 시 Retry-After 계산용. */
function msUntilNextUtcMidnight(now: number): number {
  const d = new Date(now);
  const next = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1, next - now);
}

/** day key 가 바뀐 시점에 이전 day 의 IP/글로벌 카운터를 정리. */
function gcStaleDayKeys(currentDayKey: string): void {
  // global store 는 작아서 즉시 정리.
  for (const key of globalDailyStore.keys()) {
    if (key !== currentDayKey) {
      globalDailyStore.delete(key);
    }
  }
  // IP store 는 key 가 `ip|YYYY-MM-DD` 형식 — suffix 가 currentDayKey 아니면 제거.
  const suffix = `|${currentDayKey}`;
  for (const key of ipDailyStore.keys()) {
    if (!key.endsWith(suffix)) {
      ipDailyStore.delete(key);
    }
  }
}

/** 테스트 전용 — store 초기화. */
export function resetBillingNotifyDailyQuotaForTests(): void {
  ipDailyStore.clear();
  globalDailyStore.clear();
  lastWarnedDayKey = null;
}

/** 테스트·관측 전용 — 현재 글로벌 카운터 (해당 day). */
export function getBillingNotifyDailyQuotaForTests(now: number = Date.now()): {
  globalCount: number;
  ipStoreSize: number;
} {
  return {
    globalCount: globalDailyStore.get(utcDayKey(now)) ?? 0,
    ipStoreSize: ipDailyStore.size,
  };
}
