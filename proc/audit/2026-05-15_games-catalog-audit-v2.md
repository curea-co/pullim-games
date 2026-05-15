# 2026-05-15 — /games 카탈로그 21 게임 audit v2

- **대상**: `http://localhost:3033/games` 17 official + 4 custom = **21 게임**
- **트리거**: BUG-2 (factorization drag) 머지 + CorrectBurst/RevealBanner 통합 후 회귀 점검
- **모드**: Standard (critical / high / medium)
- **방법**: 코드/logic 검토 + e2e/vitest CI 결과 인용 + (시각/모바일 인터랙션 시뮬은 사용자 dogfooding 위임)

## 1. v1 (2026-05-14) 잔존 issue 처리 현황

| Issue | Severity | PR | 상태 |
|---|---|---|---|
| BUG-1 letter-assembly text 비교 | HIGH | [#40](https://github.com/curea-co/pullim-games/pull/40) | ✅ MERGED |
| UX-2 english-word-match 진행도 | MEDIUM | [#41](https://github.com/curea-co/pullim-games/pull/41) | ✅ MERGED |
| A11y-1 cloze-multi aria-hidden | MEDIUM | [#42](https://github.com/curea-co/pullim-games/pull/42) | ✅ MERGED |
| BUG-2 factorization drag hit-test | HIGH (audit miss) | [#43](https://github.com/curea-co/pullim-games/pull/43) | ✅ MERGED |
| UX-1 bio-taxonomy hydration flash | LOW (V0.1 polish) | [#45](https://github.com/curea-co/pullim-games/pull/45) | ✅ MERGED |
| UX-3 image-hotspot 모바일 hit area | LOW (V0.1 polish) | [#46](https://github.com/curea-co/pullim-games/pull/46) | ✅ MERGED |

→ v1 6 issue 100% 해소. LOW 보류분도 폴리시 라운드에서 모두 처리 완료.

## 2. 신규 통합 회귀 점검 — CorrectBurst + RevealBanner

PR #47 (`feat/correct-feedback-and-reveal`) 통합 후:

| 점검 | 결과 |
|---|---|
| `bun run typecheck` | ✅ PASS |
| `bun run test` | ✅ 149/149 PASS (회귀 0) |
| `bun run test:e2e correct-feedback-reveal.spec.ts` | ✅ 1/1 PASS (vocab-typing 5회 wrong → reveal) |
| CI (validate + build + e2e + 게임별 test 매트릭스) | ⏳ PR #47 진행 중 |
| 4 메커니즘 (QuickQuiz / Blank / Typing / WordMatch) CorrectBurst 노출 | 코드 통합 확인 ✅ / 시각은 dogfooding |
| 12 개별 게임 (factorization, math-graph-shift, …, cloze-multi) CorrectBurst 노출 | 코드 통합 확인 ✅ / 시각은 dogfooding |
| typing 5회 wrong → RevealBanner + 정답 자동 입력 | e2e PASS ✅ |

## 3. 변별력 정책 재검 — 21/21 (Phase 2 머지 후 복귀)

audit v1 §3 "21/21 변별력 정책 준수" 결론에서 BUG-2 factorization 누락이 self-amend (v1 §audit miss 자성) 로 보고됨. v2 시점:

- **factorization**: BUG-2 fix (drag 자유 방향 + block 위치 hit-test) 머지 완료(PR #43). 메커닉 차원 변별력 0 (모든 term 드래그 → success) → plan `2026-05-14_factorization-discrimination.md` drag-to-chip 메커닉 재설계 Phase 1~5 모두 머지 (2026-05-15). **변별력 정책 정상 복귀 (1정답 + 2distractors chip)**.
- 나머지 20 게임: v1 결론 유지. 신규 통합 (CorrectBurst + RevealBanner) 은 변별력에 영향 없음 (정답/오답 판정 로직 무변경).
- 5회 wrong → reveal 정책: 변별력 정책과 학습 효과의 명시적 trade-off (사용자 결정). audit `proc/audit/2026-05-14_games-catalog-audit.md` §3.1 갱신 완료.
- factorization 의 3회 voluntary reveal: 학습 막힘 방지용 메타인지 옵션 (D2.B). reveal 시 FSRS `again` 으로 신호 보존.

## 4. 신규 finding

코드 차원 finding 0 — typecheck/test/e2e 회귀 0. 시각/모바일 인터랙션 차원 finding 은 사용자 dogfooding 시점에 발견 가능 (특히 CorrectBurst overlay z-index, RevealBanner 모바일 줄바꿈, 게임별 reveal UI 의 자연스러움).

## 5. 다음 트랙

- ✅ **factorization 변별력 강화** — `proc/plan/2026-05-14_factorization-discrimination.md` Phase 1~5 모두 머지 완료 (drag-to-chip 메커닉, distractor 자동 생성, FSRS 등급 분기, voluntary/auto reveal).
- **CorrectBurst polish (V0.1)** — 폭죽/사운드는 보류, 시각 톤 dogfooding 후 재검토.
- **production 배포** — Vercel webhook 우회 (`vercel --prod` 수동). PR #45/#46/#47/#48/#49/(Phase 2) 머지분 사용자 수동 배포 대기.

## 6. 메트릭

| 항목 | v1 initial | v1 after BUG-2 | v2 |
|---|---|---|---|
| 게임 수 | 21 | 21 | 21 |
| 라우트 SSR 200 | 21/21 | 21/21 | 21/21 (회귀 없음) |
| 콘솔 에러 | 0 | 0 | 0 |
| HIGH 미해소 | 2 | 0 | 0 |
| MEDIUM 미해소 | 2 | 0 | 0 |
| LOW 미해소 | 2 | 2 | 0 |
| vitest | 147/147 | 149/149 | 149/149 |
| e2e drag/인터랙션 spec | 0 | 2 (factorization) | 3 (+ correct-feedback-reveal) |
| 변별력 정책 준수 (코드 기준) | 21/21 (audit miss) | 20/21 (factorization 별 plan) | **21/21** (drag-to-chip 머지) |
| Health score 추정 | 92.5 | 99 | **99+** (LOW 2건 해소 + factorization 변별력 복귀) |
