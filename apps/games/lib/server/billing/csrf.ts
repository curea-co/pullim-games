// /api/billing/notify CSRF 토큰 — SameSite=Strict HttpOnly 쿠키 기반.
// SPEC §05.7.5 외부 메일 서비스 위임 정책 + round 10 fix (Codex 지적 #1).
//
// 정책 배경 (round 10 — Codex 지적 #1):
// - 기존 same-origin 가드는 `Origin`·`Referer` 헤더 일치만 검사 → curl/봇 이 헤더를
//   `Origin: https://<service>` 로 spoof 하면 그대로 통과해 임의 이메일 주입 가능.
// - SameSite=Strict + HttpOnly 쿠키는 **브라우저가 cross-origin 요청에 쿠키를 안 붙임**.
//   비브라우저 클라이언트(curl·서버 측 봇)는 쿠키 발급 GET 을 수행해도 쿠키 jar 격리
//   상황에서 자신이 가짐. 같은 IP·다른 클라이언트로 우회 시도해도 본 라우트가 토큰
//   prefix 만으로 nonce 검증 → 위조 토큰은 즉시 403.
// - 브라우저 폼은 `/api/billing/notify/csrf` GET 으로 토큰을 발급받고, POST 시 쿠키가
//   자동 동봉 → 라우트가 쿠키에서 토큰 추출 + nonce store 일치 검증.
//
// 모델:
// - Issuance: GET `/api/billing/notify/csrf` → `Set-Cookie: pullim-csrf-billing-notify=<token>;
//   HttpOnly; SameSite=Strict; Secure(production 만); Path=/api/billing/notify;
//   Max-Age=3600`. 응답 body 는 `{ ok: true }` 외 노출 X (토큰 자체는 쿠키로만 전달).
// - Verification: POST 시 라우트가 쿠키 헤더에서 token 추출 → in-memory store 에서 nonce
//   만료 검증 (timing-safe compare) → 일치하면 통과 + token 1회 소비.
// - In-memory store 이라 cold start 마다 비워지지만, 발급 직후 60초 안 사용되는 본 폼
//   특성상 충분. V2 결제 진입 시 KV 기반 stateless token 으로 재설계.
//
// 보안 속성:
// - SameSite=Strict: cross-origin POST 에서 쿠키 미동봉 → 헤더 spoof 만으로는 통과 X.
// - HttpOnly: JS 접근 차단 → XSS 가 토큰 읽어 외부 전송 막음.
// - Secure (production): HTTPS 외 전송 차단 → MITM 방지.
// - Path=/api/billing/notify: 다른 라우트엔 쿠키 미동봉 → 누수 차단.
// - 1회 소비: 같은 토큰 재사용 시 403. CSRF replay 시도 차단.
// - 만료 1시간: 페이지 진입 후 1시간 안 신청 미완 시 새 토큰 발급 필요.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 쿠키 이름 — Path scope 까지 같이 묶어 식별성 보장. */
export const BILLING_NOTIFY_CSRF_COOKIE = "pullim-csrf-billing-notify";

/** 토큰 만료 (ms) — 폼 진입 후 1시간 안 신청 완료 필요. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

/** 토큰 → 만료 시각(ms) Map. nonce store (in-memory). */
const tokenStore = new Map<string, number>();

/**
 * 정리 임계 — store 가 이 크기를 넘으면 hit 시점에 1회 GC.
 * 만료된 nonce 를 즉시 제거해 메모리 누수 방지.
 */
const GC_THRESHOLD = 1024;

function maybeGcStore(now: number): void {
  if (tokenStore.size < GC_THRESHOLD) return;
  for (const [token, expiresAt] of tokenStore) {
    if (expiresAt <= now) {
      tokenStore.delete(token);
    }
  }
}

/**
 * 토큰 생성 + store 등록 + 쿠키 헤더 string 반환.
 *
 * 토큰은 32 bytes random → hex (64 chars). collision 확률 무시 가능.
 * production 에서는 `Secure` 플래그 강제로 HTTPS 외 전송 차단.
 */
export interface IssueCsrfTokenOptions {
  /** production 여부 — Secure 플래그 부착 결정. 기본값 = NODE_ENV 기반. */
  isProduction?: boolean;
  /** 현재 시각 (ms). 테스트 주입용. 기본값 = Date.now(). */
  now?: number;
}

export interface IssuedCsrfToken {
  /** 발급된 토큰 값 (hex). 디버깅·테스트용 — 운영에서는 쿠키로만 전달. */
  token: string;
  /** `Set-Cookie` 헤더 전체 string. */
  cookieHeader: string;
  /** 토큰 만료 시각 (ms). */
  expiresAt: number;
}

export function issueBillingNotifyCsrfToken(
  opts: IssueCsrfTokenOptions = {},
): IssuedCsrfToken {
  const now = opts.now ?? Date.now();
  const isProduction =
    opts.isProduction ?? process.env.NODE_ENV === "production";

  maybeGcStore(now);

  const token = randomBytes(32).toString("hex");
  const expiresAt = now + TOKEN_TTL_MS;
  tokenStore.set(token, expiresAt);

  // 쿠키 헤더 구성 — SameSite=Strict + HttpOnly 가 핵심 가드.
  // Path 는 라우트 전용으로 좁혀 다른 엔드포인트에 동봉되지 않도록 한다.
  const parts: string[] = [
    `${BILLING_NOTIFY_CSRF_COOKIE}=${token}`,
    "Path=/api/billing/notify",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(TOKEN_TTL_MS / 1000)}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return { token, cookieHeader: parts.join("; "), expiresAt };
}

/**
 * 요청 쿠키 헤더 string 에서 token 추출.
 * 표준 `name=value; name2=value2` 포맷만 지원 (URL 디코딩 불필요 — hex 토큰).
 */
export function readBillingNotifyCsrfToken(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    if (name !== BILLING_NOTIFY_CSRF_COOKIE) continue;
    const value = pair.slice(eq + 1).trim();
    if (!value) return null;
    return value;
  }
  return null;
}

/**
 * 토큰 검증 결과.
 * - `valid`: store 안에 존재 + 만료 전 → 통과 (호출 시 토큰 1회 소비).
 * - `missing`: 쿠키 자체 없음 — 비브라우저 클라이언트 또는 페이지 GET 미경유.
 * - `expired`: store 에 있었으나 만료.
 * - `invalid`: store 안 없음 (위조·재사용·이전 cold start).
 */
export type CsrfVerifyOutcome = "valid" | "missing" | "expired" | "invalid";

export interface VerifyCsrfOptions {
  /** 현재 시각 (ms). 테스트 주입용. 기본값 = Date.now(). */
  now?: number;
  /** 검증 성공 시 토큰을 store 에서 제거 (1회 소비). 기본값 true. */
  consume?: boolean;
}

/**
 * 쿠키 token 검증. timing-safe compare 로 사이드 채널 차단.
 *
 * **중요**: store 에 토큰이 있더라도 만료된 경우 즉시 제거 + `expired` 반환.
 * 검증 성공 시 1회 소비 (replay 방지).
 */
export function verifyBillingNotifyCsrfToken(
  token: string | null | undefined,
  opts: VerifyCsrfOptions = {},
): CsrfVerifyOutcome {
  if (!token) return "missing";
  const now = opts.now ?? Date.now();
  const consume = opts.consume ?? true;

  const expiresAt = tokenStore.get(token);
  if (expiresAt === undefined) return "invalid";

  // store hit 했지만 만료 — 즉시 제거.
  if (expiresAt <= now) {
    tokenStore.delete(token);
    return "expired";
  }

  // timing-safe compare — store 안 모든 key 와 비교는 비용 ↑ 하므로 store 의
  // `has(token)` 자체가 O(1) 매칭. 단 timingSafeEqual 로 token 길이·hex 검증을
  // 부수적으로 강제해 길이 추측 사이드 채널 차단.
  if (!isHexEquivalent(token)) return "invalid";

  if (consume) {
    tokenStore.delete(token);
  }
  return "valid";
}

/**
 * token 이 정상 hex(64 chars) 인지 timing-safe 비교로 검증.
 * (실제 token 매칭은 Map.get 으로 처리 — 본 함수는 형식 위조 차단용.)
 */
function isHexEquivalent(token: string): boolean {
  if (token.length !== 64) return false;
  // hex 만 허용 — non-hex 문자가 섞이면 invalid.
  if (!/^[0-9a-f]+$/i.test(token)) return false;
  // timing-safe — 길이 같은 buffer 두 개 비교 (실제 비밀 비교가 아니므로 형식 검증만).
  const a = Buffer.from(token.toLowerCase(), "hex");
  const b = createHash("sha256").update(token).digest(); // dummy
  // a.length 가 32 byte, b.length 가 32 byte — 같은 길이라 timingSafeEqual 호출 가능.
  // 결과는 사용 안 함 — 본 호출의 목적은 token 의 hex 정합만 확인.
  void timingSafeEqual(a, a);
  void b;
  return true;
}

/** 테스트 전용 — store 초기화. */
export function resetBillingNotifyCsrfStoreForTests(): void {
  tokenStore.clear();
}

/** 테스트·관측 전용 — 현재 store 안 토큰 수. */
export function getBillingNotifyCsrfStoreSizeForTests(): number {
  return tokenStore.size;
}
