# 생물 분류 트리

- **gameId**: `bio-taxonomy`
- **과목 · 단원**: 과학 / 고1 생명과학 — 생물 분류 (진핵·원핵, 3계, 척추·무척추, 식물 4분류, 척추동물 4강)
- **상태**: `available`
- **출처 plan**: [proc/plan/2026-05-13_new-mechanics-expansion.md](../../../proc/plan/2026-05-13_new-mechanics-expansion.md) M3

## 시작하기

1. **이 디렉토리만 작업하세요.** `src/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3033/games/bio-taxonomy`
3. 테스트: `bun run test -- src/games/bio-taxonomy/`

## 핵심 명제

> **카드 배치 = retrieval. 정답 확인 전엔 정/오 표시 없음.**
> 카드를 탭해서 active 로 만들고 카테고리 박스 탭해서 배치. 카테고리 안 카드를 탭하면 풀로 복귀. 모든 카드 배치 후 "정답 확인" → token-by-token 비교. wrong 시 카드별 정/오 강조 없이 `n/m 맞췄어요` 정확도만.

## 디렉토리

```
bio-taxonomy/
  manifest.ts                    # ✅ 자동 발견 대상
  schema.ts                      # categories[2~4] + items[6~10] + categoryId refine
  component.tsx                  # 5-phase 상태머신, click-to-assign
  components/
    CategoryBox.tsx              # 라벨 + 안 카드 + receivable outline
    ItemCard.tsx                 # 카드 (active outline, 카테고리 색)
  logic/
    checkAssignments.ts          # item-by-item categoryId 비교
    checkAssignments.test.ts
  content/
    index.ts                     # 5장 카드
  README.md
```

## 카드 풀 (5장, 난이도 1→5)

1. **진핵 vs 원핵** — 카테고리 2, 카드 6 (사람·효모·짚신벌레 / 대장균·결핵균·남세균)
2. **동물·식물·균류** — 카테고리 3, 카드 6 (호랑이·개구리 / 소나무·옥수수 / 송이버섯·푸른곰팡이)
3. **척추 vs 무척추 동물** — 카테고리 2, 카드 6
4. **식물 4분류** — 카테고리 4, 카드 8 (선태·양치·겉씨·속씨)
5. **척추동물 4강** — 카테고리 4, 카드 8 (어류·파충류·조류·포유류, 양서류 V1+)

## 인터랙션 (Click-to-assign — D4 결정)

- 풀 카드 탭 → active (outline 강조)
- 카테고리 박스 라벨 탭 → active 카드를 그 카테고리에 배치 + active 해제
- 카테고리 안 카드 탭 → 풀로 복귀 + 그 카드 active
- 모든 카드 배치 후 "정답 확인" 활성

## 변별력 설계 (메모리 룰 반영)

- **답지 노출 X** — wrong 시 카드별 정/오 강조 안 함. 정확도(`n/m`) 만 노출.
- **끼워맞추기 회피** — 학생이 전체 재검토 강제. 단순 토글 시도 차단.
- **카테고리 분포 비공개** — 정답 카테고리 카드 수 표시 안 함 → 분포까지 추론 필요.
- **시간 압박 X** — 무제한 시도, FSRS rating 만 차등.

## 색깔 매핑

| 카테고리 인덱스 | 색 (Tailwind) |
|---|---|
| 0 | blue-100 / blue-800 |
| 1 | emerald-100 / emerald-800 |
| 2 | amber-100 / amber-800 |
| 3 | pink-100 / pink-800 |

카테고리 순서대로 색 부여. 5번째 색은 없음 (max 4, D5 결정).

## 비스코프 (V1+ 후보)

- 5계 분류 (원핵·원생·균·식물·동물) — 카테고리 max 5 필요, 모바일 UI 재설계
- 양서류 추가 (척추동물 5강)
- 윤리 사상가·사회 정치체제 분류 — **별 게임 (`ethics-classification`, `civics-classification`)** 으로 분리 (D3 결정)
- 카드 이미지 첨부 (현재 텍스트만)
- 카드 분포 힌트 ("동물에 N장") — 학습 보조 옵션
