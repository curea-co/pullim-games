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
// - 추가로 prune 후 fresh 가 비면 store key 자체를 삭제 (round 7 fix — Codex 지적 #2):
//   고유 IP·host 가 누적되면 빈 배열이 영구 잔존해 warm 인스턴스 메모리가 단조 증가
//   하는 문제 차단. abuse·고유 IP 폭증 시에도 Map size 가 활성 window 안의 key 수준
//   으로만 유지된다.
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

/** 테스트·관측 전용 — 현재 store 안에 보관된 key 수. */
export function getRateLimitStoreSizeForTests(): number {
  return store.size;
}

/**
 * 콜드 키 GC — store 전체를 훑어 가장 큰 window(가장 보수적) 기준으로 모든 timestamp 가
 * 만료된 bucket key 를 제거한다.
 *
 * 호출 시점: hit 진입 시 store.size 가 threshold 를 넘으면 단 1회 trigger.
 * O(N) 이지만 amortized O(1) per hit (threshold 가 일정 배수마다만 fire).
 *
 * round 7 — Codex 지적 #2: prune 후 빈 배열이 잔존하는 단조 증가 차단.
 */
const GC_BUCKET_THRESHOLD = 1024;
// fail-safe upper bound — store 가 이 이상 자라면 가장 작은 window 보다 오래된 모든 key 제거.
// hot path 안에서 단발성으로만 작동 — 비용은 hit/호출 횟수 대비 미미.

function maybeGcStore(now: number): void {
  if (store.size < GC_BUCKET_THRESHOLD) return;
  for (const [bucketKey, stamps] of store) {
    // 어떤 window 가 적용될지는 호출자별로 다르므로 보수적으로 1시간 보존 후 제거.
    // 본 라우트(`/api/billing/notify`) 의 최대 window 도 1시간이라 일치.
    const lastStamp = stamps[stamps.length - 1] ?? 0;
    if (now - lastStamp > 60 * 60_000) {
      store.delete(bucketKey);
    }
  }
}

/**
 * fresh stamp 배열을 store 에 반영. 비었으면 key 삭제 (Map 누수 차단 — round 7).
 *
 * 호출 위치 모두 prune 직후로 통일해서 "비면 삭제" 정책을 단일 진실 원천으로 보장.
 */
function persistStamps(bucketKey: string, fresh: number[]): void {
  if (fresh.length === 0) {
    store.delete(bucketKey);
    return;
  }
  store.set(bucketKey, fresh);
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

  maybeGcStore(now);

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
    persistStamps(rule.key, fresh);
    return {
      allowed: false,
      count: fresh.length,
      limit: rule.max,
      retryAfterMs,
    };
  }

  fresh.push(now);
  persistStamps(rule.key, fresh);
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

  maybeGcStore(now);

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
  // 비어 있으면 삭제 — 다만 push 직후라 length >= 1 보장. 일관성을 위해 동일 헬퍼 사용.
  persistStamps(bucketKey, fresh);
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
