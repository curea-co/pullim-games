# 한자 부수 조합 (letter-assembly)

- **gameId**: `letter-assembly`
- **과목 · 단원**: 국어 / 고1 국어 — 한자 부수 합자 (合字)
- **상태**: `available`
- **출처 plan**: [proc/plan/2026-05-13_20-game-mechanics-roadmap.md](../../../proc/plan/2026-05-13_20-game-mechanics-roadmap.md) M5

## 시작하기

1. **이 디렉토리만 작업하세요.** `src/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3033/games/letter-assembly`
3. 테스트: `bun run test -- src/games/letter-assembly/`

## 핵심 명제

> **부수 카드를 슬롯에 끼워 한자를 완성한다.**
> 카드 탭 = active → 슬롯 탭 = 배치. 슬롯 안 카드를 다시 탭하면 풀로 복귀.
> 카드 풀에 distractor 1~2개 포함. 모든 슬롯 채워야 "정답 확인" 활성.
> 정답 시 완성된 한자 + 의미 + 음 노출 → 학습 강화.

## 디렉토리

```
letter-assembly/
  manifest.ts                      # ✅ 자동 발견 대상
  schema.ts                        # LetterAssemblyCardSchema + target/slot/card
  component.tsx                    # 5-phase 상태머신
  components/
    SlotRow.tsx                    # 좌→우 슬롯 박스 (사이 "+" 표시)
    ComponentPalette.tsx           # 부수 카드 풀 (한자 + 한글 음 라벨)
  logic/
    checkAssembly.ts               # slot-by-slot cardId 비교
    checkAssembly.test.ts
  content/
    index.ts                       # 5장 카드
  README.md
```

## 카드 풀 (5장, 난이도 1→5)

| # | 한자 | 음/뜻 | 합자 | 카드 풀 (정답 + distractor) |
|---|---|---|---|---|
| 1 | 林 | 림/수풀 | 木 + 木 | 木, 木, 日 |
| 2 | 明 | 명/밝을 | 日 + 月 | 日, 月, 木 |
| 3 | 休 | 휴/쉴 | 人 + 木 | 人, 木, 日, 水 |
| 4 | 好 | 호/좋을 | 女 + 子 | 女, 子, 人, 日 |
| 5 | 森 | 삼/빽빽할 | 木 + 木 + 木 | 木, 木, 木, 日, 月 |

## 변별력 설계

- **답지 노출 X** — wrong 시 슬롯별 정/오 강조 X. 정확도(`n/m`) 만 노출.
- **끼워맞추기 회피** — distractor 카드 + 카드 자원 한정 → 단순 토글 시도 불가.
- **시간 압박 X** — 무제한 시도.

## 비스코프 (V1+)

- 한글 자모 조합 (별 game id: `hangul-assembly`)
- 영어 알파벳 스펠링 (별 game id: `english-spelling`)
- 한자 부수 의미 툴팁 — 현재는 label 만 노출
- 부수 그림(image) — 텍스트 그대로 활용
