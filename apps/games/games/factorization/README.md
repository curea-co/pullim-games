# 인수분해 블록 분리

- **gameId**: `factorization`
- **과목 · 단원**: 수학 / 고1 다항식 (공통인수, ax² + bx + c, 삼차차, 치환)
- **상태**: `available`
- **출처 명세**: [proc/spec/03 §3.1 M4](../../../proc/spec/03-핵심-기능.md), [proc/spec/06 §6.1](../../../proc/spec/06-콘텐츠-데이터.md)

## 시작하기

1. **이 디렉토리만 작업하세요.** `apps/games/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3033/games/factorization` 에서 확인.
3. 테스트: `bun run test -- games/factorization/`

## 의존성

- `@/lib/core` (barrel) — FSRS 엔진, 익명 fingerprint, 공통 schema, AST 파서
- `framer-motion` — spring 변형 애니메이션

## 디렉토리

```
factorization/
  manifest.ts                    # ✅ 자동 발견 대상 (수정 시 bun run gen:registry)
  schema.ts                      # 게임 전용 카드 스키마
  component.tsx                  # 게임 entry — 5-phase 상태 머신
  components/
    TermBlock.tsx                # 항 블록 (드래그 가능)
    DropZone.tsx                 # 공통인수 드롭 존
  logic/                         # 순수함수
    types.ts
    transform.ts                 # extractCommonFactor (UI Term 단위)
    checkAnswer.ts               # arePolynomialsEqual + deriveAnswer
    checkAnswer.test.ts
    buildCard.ts                 # 다항식 문자열 → FactorizationCard
    buildCard.test.ts
  content/
    index.ts                     # 5장 카드 (V0.1)
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

- 게임이 메인페이지에 안 보임 → `bun run gen:registry` 실행 후 `apps/games/lib/games/registry.generated.ts` 확인
- TypeScript 에러 → `manifest.ts` 의 export default가 `GameManifest` 타입 만족하는지 확인
- 동적 import 실패 → `loadComponent` 의 import 경로가 정확한지 확인
