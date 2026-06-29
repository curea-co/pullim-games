# 다중 빈칸 채우기 (cloze-multi)

- **gameId**: `cloze-multi`
- **과목 · 단원**: 영어 / 고1 영어 — 5형식 어순 (1~5형식 5장)
- **상태**: `available`
- **출처 plan**: [proc/plan/2026-05-13_20-game-mechanics-roadmap.md](../../../proc/plan/2026-05-13_20-game-mechanics-roadmap.md) M4

## 시작하기

1. **이 디렉토리만 작업하세요.** `apps/games/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3004/games/cloze-multi`
3. 테스트: `bun run test -- games/cloze-multi/`

## 핵심 명제

> **빈칸 N개 + 카드 풀(정답 N + distractor). 카드를 끼워 문장을 완성한다.**
> 카드 탭 = active → 빈칸 탭 = 배치. 빈칸 안 카드를 다시 탭하면 풀로 복귀.
> 모든 빈칸이 채워져야 "정답 확인" 활성. 오답 시 슬롯별 정/오 강조 X — 정확도(`n/m`) 만 노출.

## english-blank 와 다른 점

- english-blank: 본문 1개 + 빈칸 1개 + 4지선다 보기 → 단순 객관식
- cloze-multi: 본문 1개 + 빈칸 N개(2~5) + 카드 풀(정답 N + distractor) → 조합 정확도 + 카드 자원 한정

## 디렉토리

```
cloze-multi/
  manifest.ts                      # ✅ 자동 발견 대상
  schema.ts                        # ClozeMultiCardSchema + passage 토큰 union
  component.tsx                    # 5-phase 상태머신
  components/
    ClozePassage.tsx               # 본문 인라인 (text / blank 토큰 혼합)
    CardPalette.tsx                # 미배치 카드 풀 + active 강조
  logic/
    checkCloze.ts                  # blank-by-blank cardId 비교 + 정확도
    checkCloze.test.ts
  content/
    index.ts                       # 5장 카드 (1~5형식)
  README.md
```

## 카드 풀 (5장, 난이도 1→5)

| # | 형식 | 본문 |
|---|---|---|
| 1 | SV (1형식) | `[The baby] [slept] soundly.` (distractor: `quickly`) |
| 2 | SVC (2형식) | `[She] [became] [a doctor].` (distractor: `quickly`) |
| 3 | SVO (3형식) | `[Tom] [reads] [books] everyday.` (distractor: `happy`) |
| 4 | SVOO (4형식) | `[Mom] [gave] [me] [a gift].` (distractor: `kindly`) |
| 5 | SVOC (5형식) | `[We] [call] [him] [a genius].` (distractor: `yesterday`, `kindly`) |

## 변별력 설계 (메모리 룰 반영)

- **답지 노출 X** — wrong 시 슬롯별 정/오 강조 X. 정확도(`n/m`) 만 노출.
- **끼워맞추기 회피** — distractor 카드 포함 + 카드 자원 한정. 단순 토글 시도 불가.
- **시간 압박 X** — 무제한 시도. 오답 카운트는 FSRS rating 반영.
- **부분 점수** — 정확도 표시로 진척 보임.

## 비스코프 (V1+ 후보)

- 멀티 단원 (1~5형식 외 — 시제, 수동태, 가정법 등) → V1+ 별 game id 또는 콘텐츠 확장
- 부분 채점 점수 → FSRS rating 세분화 (현재 binary)
- 카드 드래그 (현재 click-to-assign) — M3 bio-taxonomy 드래그 패턴 차용 가능
