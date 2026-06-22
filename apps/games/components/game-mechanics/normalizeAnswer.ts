// 정답 비교용 정규화 — 사용자 입력과 정답을 같은 규칙으로 가공해서 비교.
// 사용자 피드백 (2026-05-28): 온점·반점·물음표·느낌표는 사용자가 유추할 영역이라
// 구두점 차이로 오답 처리되지 않게 함.

// 아포스트로피 류 — "I'm" / "don't" 같은 축약형은 공백 없이 붙여야 매칭 ("im" / "dont").
const APOSTROPHE_RE = /['‘’]/g;

// 일반 구두점 — 공백으로 치환 후 multi-space collapse. "ice-cream" → "ice cream" 같이
// 하이픈도 공백 처리해서 사용자가 "ice cream" 또는 "ice-cream" 둘 다 맞도록.
const PUNCTUATION_RE =
  /[.,!?;:"()[\]{}\-—–_。、，！？；：（）「」『』]/g;

const MULTI_SPACE_RE = /\s+/g;

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase()
    .replace(APOSTROPHE_RE, "")
    .replace(PUNCTUATION_RE, " ")
    .replace(MULTI_SPACE_RE, " ")
    .trim();
}
