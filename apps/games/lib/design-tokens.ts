// 디자인 토큰 — 리터럴 hex 가 필요한 표면(Framer Motion `animate`, `next/og` `ImageResponse`,
// PWA manifest)용 **단일 소스**. 이 표면들은 Tailwind 유틸리티 클래스를 못 쓰므로 값을
// 리터럴로 넘겨야 하는데, 그렇다고 각 파일에 hex 를 흩뿌리면 팔레트 변경 시 표류한다
// (#131 remap 이 이런 하드코딩 hex 를 놓쳐 PR #135 에서 회귀 정리됨).
//
// SoT 위계: `proc/spec/08-디자인-시스템.md §8.1`(권위) → `tailwind.config.ts`(Tailwind 표면)
// → **본 모듈**(비-Tailwind 표면). 세 곳은 동일 hex 를 공유하며 한쪽만 바뀌면 표류다.
// globals CSS-var 병행 시스템은 도입하지 않는다(Phase 1 codex R1 — 미소비·spec 드리프트 회피).
//
// 값은 spec/08 §8.1 시맨틱 앵커와 1:1. 새 토큰 필요 시 spec/08 §8.1 + tailwind.config + 본 모듈
// 세 곳을 동시 갱신한다.

/** spec/08 §8.1 팔레트 — 리터럴 hex 표면 공유용. */
export const palette = {
  /** blue accent — CTA·정답 glow·드롭존 활성 (`--pullim-blue`). */
  blue: "#0362DA",
  /** ink — 주요 텍스트·헤딩 (`--pullim-ink`, type-primary). */
  ink: "#0D1A1F",
  /** ink3 — 보조 텍스트 (`--type-secondary`). */
  ink3: "#45555C",
  /** paper — 페이지 배경 (`--pullim-paper`, bg-primary). */
  paper: "#F0F6FB",
  /** lemon — 하이라이트 강조 한정 (게임화 재화·뱃지 금지, 하이퍼캐주얼 룰). */
  lemon: "#E6FF4C",
  /** bg-block — 카드·블록 surface. */
  bgBlock: "#FFFFFF",
  /** line/hairline — 미세 경계선 (`--border-hairline`). */
  line: "#D6E2EE",
  /** accent-negative — 오답 시 절제된 강조. */
  negative: "#F87171",
} as const;
