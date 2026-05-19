// 사용자 입력 sanitize — content 입력 영역 1차 방어.
// plan: proc/plan/2026-05-19_plan-d-v2-billing-and-sanitize.md Phase 3.
//
// 현재 본 프로젝트는 dangerouslyHTML 사용 0 → React 자동 escape 가 1차 방어.
// 본 helper는 사용자 입력을 localStorage에 저장하기 전 명시 sanitize — 추후
// dangerouslyHTML 도입 시 깨지지 않게 안전판.

// HTML script tag 제거
const SCRIPT_TAG_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const SCRIPT_OPEN_RE = /<script\b[^>]*>/gi;

// inline event handler 속성 제거 (on click·on load·on error 등)
const EVENT_HANDLER_RE = /\s*on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

// javascript: URL 제거
const JS_URL_RE = /javascript:/gi;

// data: URL — 일부만 위험 (HTML·script payload). 본 plan은 단순 정규식이라 일괄 제거.
const DATA_URL_HTML_RE = /data:\s*text\/(html|javascript)/gi;

/**
 * 사용자 텍스트 입력 sanitize — XSS 1차 방어.
 *
 * 제거 패턴:
 * - `<script>...</script>` block 및 unclosed script tag
 * - inline event handler `on*=` (onclick·onload 등)
 * - `javascript:` URL
 * - `data:text/html` · `data:text/javascript` URL
 *
 * dompurify 같은 풀 sanitizer 미사용 — 본 프로젝트는 dangerouslyHTML 미사용이라
 * React 자동 escape 가 1차. 본 helper 는 명시 sanitize 안전판.
 */
export function sanitizeUserText(input: string): string {
  if (!input) return input;
  let out = input;
  out = out.replace(SCRIPT_TAG_RE, "");
  out = out.replace(SCRIPT_OPEN_RE, "");
  out = out.replace(EVENT_HANDLER_RE, "");
  out = out.replace(JS_URL_RE, "");
  out = out.replace(DATA_URL_HTML_RE, "");
  return out;
}
