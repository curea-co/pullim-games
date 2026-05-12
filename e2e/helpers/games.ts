// 14 official 게임 메타 — Playwright e2e 매트릭스 input.
// `proc/plan/2026-05-11_qa-playwright-setup.md` §4.3 참조.
//
// custom-* 4 종은 사용자 콘텐츠 (localStorage) 의존이라 Phase 2 에서 별도 setup.
// Phase 1 은 10 official 게임만.

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
];
