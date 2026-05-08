# 인수분해 블록 분리

- **gameId**: `factorization`
- **과목 · 단원**: 수학 / 고1 다항식 (공통인수, ax² + bx + c, 삼차차, 치환)
- **상태**: `available` (placeholder — 본격 구현은 V1 Phase 1 Lane B)
- **출처 명세**: [proc/spec/03 §3.1 M4](../../../proc/spec/03-핵심-기능.md), [proc/spec/06 §6.1](../../../proc/spec/06-콘텐츠-데이터.md)

## 시작하기

1. **이 디렉토리만 작업하세요.** `src/lib/core/` 변경이 필요하면 별도 PR.
2. `npm run dev` → `http://localhost:3000/games/factorization` 에서 확인.
3. 테스트: `npm test -- src/games/factorization/` (Phase 1 셋업 후)

## 의존성

- `@/lib/core` (barrel) — FSRS 엔진, 익명 fingerprint, 공통 schema
- `mathjs` — 다항식 AST 파싱
- `framer-motion` — spring 변형 애니메이션

## 디렉토리

```
factorization/
  manifest.ts         # ✅ 자동 발견 대상 (수정 시 npm run gen:registry)
  component.tsx       # 게임 entry (server/client 경계 명시)
  components/         # 이 게임 전용 sub-component (Phase 1)
    MathBlock.tsx
    DropZone.tsx
  state/              # 게임 전용 Zustand 스토어 (Phase 1)
  logic/              # 순수함수 — AST 변형, 정답 판정 (Phase 1)
    transform.ts      # property-based test 강제
    checkAnswer.ts    # equivalent form 매칭, REGRESSION 강제
  content/cards/      # 5장 카드 JSON (Phase 1)
  tests/              # 게임 전용 테스트 (Phase 1)
```

## 핵심 명제

> **풀이 동작 = 게임 메커닉 = retrieval practice.**
> 다항식이 블록으로 떠 있고, 공통인수를 손가락으로 끌어내면 식이 변형됨. 학생이 게임을 하는데 동시에 인수분해 알고리즘을 손으로 익힘.

## 카드 풀 (5장, 난이도 1~5)

상세: [proc/spec/06 §6.1](../../../proc/spec/06-콘텐츠-데이터.md)

1. `2x + 4` → `2(x + 2)`
2. `x² + 5x + 6` → `(x + 2)(x + 3)`
3. `2x² + 7x + 3` → `(2x + 1)(x + 3)`
4. `x³ - 1` → `(x - 1)(x² + x + 1)`
5. `x⁴ - 5x² + 4` → `(x - 1)(x + 1)(x - 2)(x + 2)`

## 핵심 디자인 결정 (수정 금지 — SPEC 변경 필요)

- **Term 단위 = 1 블록** (`2x²`, `7x`, `3`이 각 1개)
- 폭죽/축포/이모지 X — 정답 시 jade glow + spring morph 220ms만 (proc/spec/08 §8.6)
- 외재 보상 최소화 — 스트릭 / FOMO / 가챠 금지 (proc/spec/01 §6)
- 한국어 톤: 존댓말 (해요체)

## 트러블슈팅

- 게임이 메인페이지에 안 보임 → `npm run gen:registry` 실행 후 `src/lib/games/registry.generated.ts` 확인
- TypeScript 에러 → `manifest.ts` 의 export default가 `GameManifest` 타입 만족하는지 확인
- 동적 import 실패 → `loadComponent` 의 import 경로가 정확한지 확인
