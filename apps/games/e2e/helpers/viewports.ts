// 6 viewport 매트릭스 — `proc/plan/2026-05-11_qa-playwright-setup.md` §4.3.
//
// mobile-sm : iPhone SE 1세대 (가장 작은 viewport)
// mobile    : iPhone 13/14
// mobile-land: 가로 모드 (높이가 가장 작음)
// tablet    : iPad 세로
// desktop   : 노트북 표준
// wide      : 큰 모니터
//
// strictCta 분기 (plan §5.1):
// - true  : CTA boundingBox 가 첫 viewport 안에 들어와야 함 (회귀 게이트)
// - false : page 200 + CTA exists + 콘솔 에러 0 만 (작은 viewport 는 콘텐츠 길이 의해 스크롤 자연스러움)
//
// 진짜 사용자 보고 회귀 (`min-h-dvh` 버그) 는 표준 모바일 viewport 에서 발생 → 그 이상만 엄격 검증.

export interface Viewport {
  name: string;
  width: number;
  height: number;
  /** CTA boundingBox assertion 강제 여부. false = 약식 (page 200 + CTA exists). */
  strictCta: boolean;
}

export const VIEWPORTS: Viewport[] = [
  { name: "mobile-sm",   width: 320,  height: 568,  strictCta: false }, // iPhone SE 1세대 — edge case
  { name: "mobile",      width: 390,  height: 844,  strictCta: true },  // iPhone 13 — 회귀 게이트
  { name: "mobile-land", width: 844,  height: 390,  strictCta: false }, // 가로 모드 — 학습 앱 비주류
  { name: "tablet",      width: 768,  height: 1024, strictCta: true },
  { name: "desktop",     width: 1280, height: 800,  strictCta: true },
  { name: "wide",        width: 1920, height: 1080, strictCta: true },
];
