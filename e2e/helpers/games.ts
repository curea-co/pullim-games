// 15 official + 4 custom 게임 메타 — Playwright e2e 매트릭스 input.
// `proc/plan/2026-05-11_qa-playwright-setup.md` §4.3 + `2026-05-12_daily-outcome-cleanup.md` §2.2 참조.
// `2026-05-12_game-discrimination-and-polish.md` Phase 1 에서 english-vocab-typing 추가 (15번째).
//
// official 11 — 콘텐츠가 코드 내장이라 별도 setup 불필요.
// custom-* 4 — localStorage seed (helpers/seed.ts) 필수. spec 에서 beforeEach 로 주입.

// GameShellVariant 와 동일 — e2e/ 가 src 외부라 path import 회피 위해 재정의.
// 본 plan §4.3 참조. Phase 2 에서 source 와 sync 검증 추가 권장.
type Variant = "split" | "stack" | "match";

export interface GameE2EMeta {
  id: string;
  variant: Variant;
  /** 첫 viewport 진입 시 노출되는 CTA 버튼 텍스트 정규식. */
  ctaTextPattern: RegExp;
}

export const OFFICIAL_GAMES: GameE2EMeta[] = [
  { id: "factorization",      variant: "stack", ctaTextPattern: /다음|마치기/ },
  { id: "math-graph-shift",   variant: "split", ctaTextPattern: /확인|다음|마치기/ },
  { id: "math-quick-quiz",    variant: "split", ctaTextPattern: /다음/ },
  { id: "physics-vector",     variant: "split", ctaTextPattern: /확인|다음|마치기/ },
  { id: "chemistry-balance",  variant: "split", ctaTextPattern: /균형 확인|다음|마치기/ },
  { id: "history-timeline",   variant: "split", ctaTextPattern: /다음|마치기/ },
  { id: "english-order",      variant: "split", ctaTextPattern: /다음|마치기/ },
  { id: "english-blank",      variant: "split", ctaTextPattern: /다음|보기를 골라주세요/ },
  { id: "english-word-match", variant: "match", ctaTextPattern: /다음|마치기/ },
  { id: "vocab-typing",       variant: "split", ctaTextPattern: /확인|다음|마치기/ },
  { id: "english-vocab-typing", variant: "split", ctaTextPattern: /확인|다음|마치기/ },
];

// custom-* 4 게임 — localStorage seed (helpers/seed.ts) 필수.
// mechanic 일반화 컴포넌트 호출이라 CTA pattern 은 호출 mechanic 과 동일:
// - custom-multiple-choice → QuickQuiz (math-quick-quiz 와 동일 패턴)
// - custom-blank → Blank (english-blank 와 동일 패턴)
// - custom-typing → Typing (vocab-typing 과 동일 패턴)
// - custom-word-match → WordMatch (english-word-match 와 동일 패턴)
export const CUSTOM_GAMES: GameE2EMeta[] = [
  { id: "custom-multiple-choice", variant: "split", ctaTextPattern: /다음/ },
  { id: "custom-blank",           variant: "split", ctaTextPattern: /다음|보기를 골라주세요/ },
  { id: "custom-typing",          variant: "split", ctaTextPattern: /확인|다음|마치기/ },
  { id: "custom-word-match",      variant: "match", ctaTextPattern: /다음|마치기/ },
];
