# 2026-05-19 — Plan C: 변별력 정책 추상화 + 메커니즘 통합 + 카드 수 minimum

- **상태**: DRAFT (2026-05-19) — §1 합의 대기 → 3 Phase 분할 진행.
- **트리거**: audit v3 §7 informational 3건 통합 — (1) 변별력 정책 추상화 부재 (factorization만 plan v2 distractor 패턴) (2) english-word-match WordMatchComponent 미통합 (직접 구현) (3) 카드 수 16/21 게임이 5장 → FSRS 회전 ≤1일.
- **메모리 룰**: 학습효과 > 중독성 · 단일 백본 + 다중 모드 · 결단력 있게 실행.
- **연관**: `proc/spec/03-핵심-기능.md` (카드 수 정책), `proc/spec/06-콘텐츠-데이터.md` (변별력 distractor schema), audit v3 §7.

## 0. 현 상태

### A. 변별력 정책 분포
- **factorization**: `distractors: z.array(z.string()).length(2).optional()` + `buildCard` 자동 생성 (plan v2 표준)
- **math-quick-quiz, cloze-multi, BlankComponent 류**: 콘텐츠 `choices: [...]` 수동 4지선다
- **image-hotspot**: 카드 풀 안에 distractor 1개 섞기
- **나머지 13 게임**: 메커닉 자체가 변별 (drag/sort/typing) — distractor 개념 약함

→ 정책 불일치. 객관식 메커니즘만 distractor 표준화 가능.

### B. english-word-match
- 직접 구현 (`src/games/english-word-match/component.tsx` 380+ LOC). seededShuffle·grid·matched 로직 자체 보유.
- `WordMatchComponent` (`src/components/game-mechanics/WordMatchComponent.tsx`) 동일 메커닉 별 구현체.
- 메커니즘 컴포넌트 활용률 1/2 (custom-word-match만 사용).
- 향후 WordMatchComponent 개선이 english-word-match에 전파 안 됨.

### C. 카드 수
- 17 official 중 16개 = 5장
- factorization만 10장 (plan v2 distractor 확장 결과)
- FSRS 큐 회전 ≤1일 → 모든 카드 즉시 due-soon spike (Plan A C7 fix 후에도 빈도 영향)

## 1. 추천 설계

### A. 변별력 helper — `src/lib/core/distractor/`
공통 함수:
```ts
// src/lib/core/distractor/index.ts
export function buildDistractors(
  correct: string,
  pool: string[],
  count: number = 2,
  seed?: number,
): string[] {
  // pool 에서 correct 제외 + seeded shuffle + count 개 추출
}
```

객관식 메커니즘 게임에서 점진 적용. 본 plan은 helper만 신설 + 1~2 게임 시범 적용 — 나머지는 별 트랙.

### B. english-word-match → WordMatchComponent
- english-word-match `component.tsx` 380 LOC → WordMatchComponent wrapper 40 LOC
- 메커니즘 컴포넌트의 props (`cards`, `gameId`, `completionMessage`, `emptyMessage`) 만 전달
- 자체 구현된 로직(seededShuffle 등)은 메커니즘 컴포넌트로 이동 (이미 동일 로직 있을 듯)

### C. 카드 수 minimum 룰
- `proc/spec/03-핵심-기능.md §X` 신규 — "official 게임당 ≥10장 (V1 카탈로그 기준)"
- 본 plan은 룰 명시만. 실제 카드 확장은 별 트랙 (콘텐츠 작성 작업).

## 2. 결정점

### D1 — buildDistractors 적용 대상
- **(A 추천)** Phase 1: helper만 신설 + math-quick-quiz 1 게임 시범. 나머지 객관식(cloze-multi·BlankComponent 류·custom-multiple-choice) 점진 적용은 별 트랙.
- (B) Phase 1에 모든 객관식 게임 일괄 마이그레이션. 작업 폭 큼.

→ A 채택.

### D2 — english-word-match 마이그레이션 깊이
- **(A 추천)** WordMatchComponent props 호환 검증 → 직접 마이그레이션. 자체 로직(seededShuffle·extras) 은 WordMatchComponent 안에 이미 있거나 추가.
- (B) english-word-match 자체 유지, WordMatchComponent 와 시그니처만 동기화.

→ A 채택. 단일 구현체.

### D3 — 카드 수 minimum 룰 명시 위치
- **(A 추천)** `proc/spec/03-핵심-기능.md §X` 신설. 권위 문서. G1/G3/G4 합의 필요.
- (B) audit 룰만 (`~/dev_git/.pullim-meta/CONVENTION.md §9` 신설).

→ A 채택 (spec 정착 + audit 트리거).

## 3. 작업 항목

### Phase 1 — buildDistractors helper + math-quick-quiz 시범 (1 PR)
- [ ] `src/lib/core/distractor/index.ts` 신규 — `buildDistractors(correct, pool, count, seed)`
- [ ] `src/lib/core/distractor/index.test.ts` — 빈 pool·correct 제외·seed 재현성·count 부족·duplicate 처리 5건
- [ ] `src/lib/core/index.ts` barrel export
- [ ] `math-quick-quiz/content/index.ts` 또는 component 에서 시범 적용 — 4지선다 distractor 자동 생성
- [ ] vitest + e2e 회귀 0
- [ ] ui:audit math-quick-quiz ✅

### Phase 2 — english-word-match → WordMatchComponent (1 PR)
- [ ] WordMatchComponent props 분석 → english-word-match 콘텐츠 호환 확인
- [ ] english-word-match `component.tsx` 380 LOC → wrapper 40 LOC (WordMatchComponent 호출)
- [ ] WordMatchComponent 에 누락된 로직 (seededShuffle·extras 등) 통합
- [ ] e2e — english-word-match 첫 매칭·5회 wrong·reveal 검증 (회귀 0)
- [ ] ui:audit english-word-match ✅

### Phase 3 — 카드 수 minimum 룰 spec 신설 (1 PR, G1·G3·G4 합의 후)
- [ ] `proc/spec/03-핵심-기능.md §X` 신설 — "official 게임당 ≥10장 (V1)"
- [ ] audit v4 트리거 조건 추가 — "official 게임 카드 수 < 10 발견 시 informational"
- [ ] CLAUDE.md §3 권위 문서 행에 §X 신설 반영
- 실제 카드 확장 (16 게임 × +5장) 은 별 콘텐츠 작성 트랙

## 4. 비스코프

- **객관식 외 게임의 변별력 강화** — drag/sort/typing 메커닉의 distractor 개념은 적용 안 됨. 본 plan 영구 비스코프.
- **실제 카드 콘텐츠 확장 (16 × +5)** — 콘텐츠 작성 작업, 별 트랙.
- **modes 비-default 모드 (Plan E)** — 별 plan.

## 5. 영향도

| Phase | 변경 | LOC | PR |
|---|---|---|---|
| 1 (distractor helper) | 신규 + test + 1 게임 적용 | +120 | 1 |
| 2 (english-word-match 통합) | 380 LOC 삭제 → 40 LOC wrapper | -340 net | 1 |
| 3 (카드 수 룰 spec) | docs only | +30 | 1 |

→ 총 ≈-190 LOC net (english-word-match 단순화 효과).
