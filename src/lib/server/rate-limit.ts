// 인메모리 sliding-window rate limiter.
// SPEC §05.7.5 외부 메일 서비스 위임 정책 + §05.6 학생 보호(BR-PAY3).
//
// 설계:
// - 외부 인프라(Redis·KV) 의존 0 — `proc/spec/09-기술-환경.md` 인프라 의존 0 원칙 준수.
// - 모듈 스코프 Map 으로 IP·key 별 timestamp 배열 보관 (sliding window).
// - serverless cold start 마다 초기화되지만, 알림 신청 abuse 의 1차 방어막으로 충분.
//   (Vercel serverless 는 같은 인스턴스가 단시간 다중 호출 처리 — abuser 가 한 인스턴스에
//    얹히면 즉시 차단. 분산 환경 정밀 limit 은 V2 결제 진입 시 KV 도입과 함께 재설계.)
// - 메모리 누수 방지를 위해 hit 마다 만료된 stamp 를 prune.
//
// Codex round 3 지적 #2 — 같은-origin 검증과 함께 라우트 가드 핵심.

export interface RateLimitRule {
  /** 식별 key (IP·fingerprint). 빈 문자열 입력 시 limit 0 — 익명 fallback */
  key: string;
  /** sliding window 길이 (ms). 예: 60_000 = 1분 */
  windowMs: number;
  /** window 내 허용 hit 수 */
  max: number;
}

export interface RateLimitDecision {
  /** 허용 여부 */
  allowed: boolean;
  /** 현 window 안의 hit 수 (이번 hit 포함) */
  count: number;
  /** rule.max */
  limit: number;
  /** 다음 hit 가 가능해질 때까지 남은 ms (allowed=false 일 때 의미 있음). 0 이면 즉시. */
  retryAfterMs: number;
}

/** 모듈 스코프 store — key → 최근 hit timestamp ms 배열 (오름차순). */
const store = new Map<string, number[]>();

/** 테스트 전용 — store 초기화. */
export function resetRateLimitForTests(): void {
  store.clear();
}

/**
 * 단일 hit 시도. window 안의 hit 수가 max 미만이면 timestamp 를 push 하고 allowed=true.
 * 초과하면 push 하지 않고 allowed=false.
 *
 * 빈 key 는 limit 즉시 거부 (식별 불가 → 안전 default).
 */
export function checkRateLimit(
  rule: RateLimitRule,
  now: number = Date.now(),
): RateLimitDecision {
  if (!rule.key) {
    return { allowed: false, count: 0, limit: rule.max, retryAfterMs: rule.windowMs };
  }

  const windowStart = now - rule.windowMs;
  const stamps = store.get(rule.key) ?? [];
  // 만료된 stamp prune.
  let firstFresh = 0;
  while (firstFresh < stamps.length && stamps[firstFresh] <= windowStart) {
    firstFresh += 1;
  }
  const fresh = firstFresh === 0 ? stamps : stamps.slice(firstFresh);

  if (fresh.length >= rule.max) {
    // 가장 오래된 stamp 가 만료되는 시점까지 대기 필요.
    const retryAfterMs = Math.max(0, fresh[0] + rule.windowMs - now);
    store.set(rule.key, fresh);
    return {
      allowed: false,
      count: fresh.length,
      limit: rule.max,
      retryAfterMs,
    };
  }

  fresh.push(now);
  store.set(rule.key, fresh);
  return {
    allowed: true,
    count: fresh.length,
    limit: rule.max,
    retryAfterMs: 0,
  };
}

/**
 * 여러 rule 을 동시에 평가 (AND). 하나라도 거부되면 거부.
 *
 * **중요**: 각 rule 은 자기만의 store bucket 을 가져야 한다. 두 rule 이 같은 `key`
 * 를 공유해도 windowMs·max 가 다르면 별도 stamp 리스트로 추적해야 함.
 * 본 함수는 내부적으로 `key|windowMs|max` 를 bucket key 로 사용해서 격리한다.
 *
 * 동작 순서:
 * 1. 모든 rule 에 대해 거부 여부만 먼저 검사 (store mutation 0).
 * 2. 하나라도 거부면 즉시 그 rule 의 decision 반환 — 누구도 push 하지 않음
 *    (거부 시점에 stamp 누적 방지).
 * 3. 모두 허용이면 그제서야 모두 push.
 */
export function checkRateLimits(
  rules: RateLimitRule[],
  now: number = Date.now(),
): RateLimitDecision {
  if (rules.length === 0) {
    return { allowed: true, count: 0, limit: 0, retryAfterMs: 0 };
  }

  const buckets = rules.map((rule) => ({
    rule,
    bucketKey: `${rule.key}|${rule.windowMs}|${rule.max}`,
  }));

  // 1차 — 거부 검사 (dry-run, push 없음).
  for (const { rule, bucketKey } of buckets) {
    const decision = peekRateLimit(bucketKey, rule, now);
    if (!decision.allowed) {
      return decision;
    }
  }

  // 2차 — 모두 허용이면 push.
  let last: RateLimitDecision = {
    allowed: true,
    count: 0,
    limit: 0,
    retryAfterMs: 0,
  };
  for (const { rule, bucketKey } of buckets) {
    last = commitRateLimit(bucketKey, rule, now);
  }
  return last;
}

function peekRateLimit(
  bucketKey: string,
  rule: RateLimitRule,
  now: number,
): RateLimitDecision {
  if (!rule.key) {
    return { allowed: false, count: 0, limit: rule.max, retryAfterMs: rule.windowMs };
  }
  const windowStart = now - rule.windowMs;
  const stamps = store.get(bucketKey) ?? [];
  let firstFresh = 0;
  while (firstFresh < stamps.length && stamps[firstFresh] <= windowStart) {
    firstFresh += 1;
  }
  const freshLen = stamps.length - firstFresh;
  if (freshLen >= rule.max) {
    const retryAfterMs = Math.max(0, stamps[firstFresh] + rule.windowMs - now);
    return {
      allowed: false,
      count: freshLen,
      limit: rule.max,
      retryAfterMs,
    };
  }
  return {
    allowed: true,
    count: freshLen + 1,
    limit: rule.max,
    retryAfterMs: 0,
  };
}

function commitRateLimit(
  bucketKey: string,
  rule: RateLimitRule,
  now: number,
): RateLimitDecision {
  const windowStart = now - rule.windowMs;
  const stamps = store.get(bucketKey) ?? [];
  let firstFresh = 0;
  while (firstFresh < stamps.length && stamps[firstFresh] <= windowStart) {
    firstFresh += 1;
  }
  const fresh = firstFresh === 0 ? stamps : stamps.slice(firstFresh);
  fresh.push(now);
  store.set(bucketKey, fresh);
  return {
    allowed: true,
    count: fresh.length,
    limit: rule.max,
    retryAfterMs: 0,
  };
}

/**
 * `x-forwarded-for` / `x-real-ip` 등에서 클라이언트 IP 추출.
 *
 * Vercel·CF·Nginx 등 표준 헤더 우선. 식별 불가하면 빈 문자열 반환 →
 * `checkRateLimit` 이 거부 default 로 처리.
 */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // 첫 IP 만 신뢰 (proxy chain 의 client side).
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  // 마지막 fallback — cf-connecting-ip 등.
  const cf = headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  return "";
}
