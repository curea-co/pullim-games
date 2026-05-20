// 이메일 → SHA-256 hex hash 변환 (단방향, PII 0).
// SPEC §05.6 알림 신청 — 원본 이메일은 절대 서버에 전송하지 않는다.
//
// Web Crypto API 사용 → Node 18+ · Edge · 브라우저 모두 동작.

/** 정규화된 이메일을 SHA-256 hex hash 로 변환. */
export async function hashEmail(rawEmail: string): Promise<string> {
  const normalized = normalizeEmail(rawEmail);
  if (!normalized) {
    throw new Error("email is empty after normalization");
  }
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bufferToHex(digest);
}

/**
 * 이메일 정규화: lowercase + trim.
 *
 * 의도적으로 단순화 — `User@Example.com` 과 `user@example.com` 을
 * 같은 신청자로 dedupe 하기 위해. plus-aliasing (`user+tag@…`) 은
 * 별 신청자로 처리 (다른 이메일이라 단방향 hash 가 다름 — 의도 보존).
 */
export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
