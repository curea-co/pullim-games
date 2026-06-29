# 펀넷 사각형 비율

- **gameId**: `genetics-punnett`
- **과목 · 단원**: 과학 / 고1 생명과학 — 멘델 유전 (단성·양성잡종, 검정교배)
- **상태**: `available`
- **출처 plan**: [proc/plan/2026-05-13_new-mechanics-expansion.md](../../../proc/plan/2026-05-13_new-mechanics-expansion.md) M1

## 시작하기

1. **이 디렉토리만 작업하세요.** `apps/games/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3004/games/genetics-punnett` 에서 확인.
3. 테스트: `bun run test -- games/genetics-punnett/`

## 핵심 명제

> **자손 격자에서 표현형 빈도 = retrieval. 색칠은 정답 확인 후만.**
> 부모 유전자형이 주어지면 자손 격자는 자동 채움. 학생은 각 자손 칸의 우성/열성을 판단해서 표현형 비율을 입력. 확인 전엔 격자가 색칠되지 않아 끼워맞추기 불가.

## 디렉토리

```
genetics-punnett/
  manifest.ts                    # ✅ 자동 발견 대상 (bun run gen:registry)
  schema.ts                      # PunnettCardSchema (CardBaseSchema.extend)
  component.tsx                  # 5-phase 상태머신 (playing → checking → correct/wrong)
  components/
    PunnettGrid.tsx              # gametes 외적 격자 + 표현형 색칠
    RatioInput.tsx               # 표현형별 +/- 입력 (chemistry-balance CoefAtom 패턴)
  logic/                         # 순수함수
    computeOffspring.ts          # gametes 외적 + 표현형 분류
    computeOffspring.test.ts
    checkRatio.ts                # 약분 동치 비교 (9:3:3:1 vs 18:6:6:2 등)
    checkRatio.test.ts
  content/
    index.ts                     # 5장 카드
  README.md
```

## 카드 풀 (5장, 난이도 1~5)

1. `Aa × Aa` → 3:1 (단성 자손교배, 우성/열성 1:3)
2. `Aa × aa` → 1:1 (검정교배)
3. `AaBb × aabb` → 1:1:1:1 (양성잡종 검정교배)
4. `AaBb × Aabb` → 3:3:1:1 (한 형질만 이형)
5. `AaBb × AaBb` → 9:3:3:1 (멘델의 양성잡종 자손교배)

## 변별력 설계 (메모리 룰 반영)

- **답지 노출 X**: playing 중 격자 색칠 없음. 학생이 우성/열성을 직접 판단.
- **끼워맞추기 회피**: 비율 입력 후 "정답 확인" 클릭 → 즉시 정/오 표시 X (200ms 진입 지연 → 결정 후 결과).
- **약분 동치**: `[9,3,3,1]` 입력도, `[18,6,6,2]` 입력도, raw `[9,3,3,1]` (4×4 격자 그대로 셈) 도 모두 정답.
- **시간 압박 X**: 무제한 시도. 오답 카운트는 FSRS rating 에만 반영 (`good` / `hard` / `again`).

## 비스코프 (V1+ 후보)

- 불완전우성 (Aa × Aa → 1:2:1, 표현형 3개)
- 치사유전 (열성치사 → 2:1 비)
- 복대립유전자 (ABO 혈액형)
- 부모 대립유전자 카드 드래그 (V0 = 유전자형 고정)

## 디자인 결정 (수정 금지 — plan 변경 필요)

- gametes 중복 보존 (AA → ["A","A"]) — 펀넷 사각형 교과서 표준
- 표현형 카테고리 순서: A_B_, A_bb, aaB_, aabb (양성잡종 기준)
- 색칠 phenotype 매핑: mint / pullim-blue / amber / pullim-slate
- 외재 보상 최소화 — 폭죽/이모지 X, 색 변화만

## 트러블슈팅

- 게임이 메인페이지에 안 보임 → `bun run gen:registry` 실행 후 `apps/games/lib/games/registry.generated.ts` 확인
- 비율 입력해도 "정답 확인" 비활성 → ratio 전체 0 일 때 비활성. 1 이상 입력 필요.
