// P-B 회원 재연결 — legacy email 지문(emailMatchHash) 계산.
// 근거: proc/plan/2026-07-07_HANDOFF-pullim-api-games-member-relink-P-B.md §1(바이트 일치 계약),
//       proc/plan/2026-07-08_pb-member-relink-consume.md §B.
//
// ⚠️ pullim-api 와 **바이트 일치**해야 재연결이 성립한다:
//    emailMatchHash = hex_lower( HMAC_SHA256( key = GAMES_EMAIL_MATCH_PEPPER, msg = normalize(email) ) )
//    normalize(email) = email.trim().toLowerCase()   (gmail dot/plus 등 provider 정규화 미적용)
// 이 계약을 바꾸면 두 시스템 해시가 어긋나 재연결이 조용히 실패한다 — 테스트 벡터(email-match-hash.test.ts)로 고정.
import "server-only";
import { createHmac } from "node:crypto";

/** 재연결 대조용 정규화 — trim + toLowerCase **만**(핸드오프 §1). provider별 정규화 금지(비대칭·취약). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * legacy email 지문 계산. key(pepper)는 pullim-api 와 동일 값이어야 같은 해시가 나온다.
 * pepper 는 호출부에서 `getEmailMatchPepper()` 로 얻어 주입한다(미주입=재연결 dormant).
 */
export function computeEmailMatchHash(email: string, pepper: string): string {
  return createHmac("sha256", pepper).update(normalizeEmail(email)).digest("hex");
}

/**
 * 공유 pepper(`GAMES_EMAIL_MATCH_PEPPER`) 로딩. 미설정·빈값이면 `null`.
 * `null` 이면 재연결·백필은 **dormant**(에러 아님) — pullim-api 도 salt 없으면 `emailMatchHash:null`
 * 을 주므로(핸드오프 §1 fail-soft), 양측이 salt 주입 전까진 자연히 비활성이다.
 * 실값은 코드·문서에 커밋하지 않는다(사람 게이트: BE 오너가 양 레포 동일 주입).
 */
export function getEmailMatchPepper(): string | null {
  const pepper = process.env.GAMES_EMAIL_MATCH_PEPPER;
  return pepper && pepper.length > 0 ? pepper : null;
}
