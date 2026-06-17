# 품사 태깅

- **gameId**: `korean-pos-tagging`
- **과목 · 단원**: 국어 / 고1 국어 — 9품사 (V0: 7품사 — 명사·대명사·동사·형용사·관형사·부사·조사)
- **상태**: `available`
- **출처 plan**: [proc/plan/2026-05-13_new-mechanics-expansion.md](../../../proc/plan/2026-05-13_new-mechanics-expansion.md) M2

## 시작하기

1. **이 디렉토리만 작업하세요.** `src/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3033/games/korean-pos-tagging`
3. 테스트: `bun run test -- src/games/korean-pos-tagging/`

## 핵심 명제

> **토큰 태깅 = retrieval. 색은 학생이 직접 칠하고, 정답 확인 후엔 정확도만 노출.**
> 어절을 탭하고 팔레트에서 품사를 고르면 토큰이 그 색으로 칠해진다. 모두 칠해야 "정답 확인" 활성. 오답 시 토큰별 정/오 표시 X — `n/m 맞췄어요` 정확도만 노출해서 학생이 전체를 재검토하게 강제.

## 디렉토리

```
korean-pos-tagging/
  manifest.ts                    # ✅ 자동 발견 대상
  schema.ts                      # KoreanPosTaggingCardSchema + POS_VALUES (7품사 enum)
  component.tsx                  # 5-phase 상태머신
  components/
    SentenceTokens.tsx           # 인라인 토큰 버튼 (active outline + 품사 색)
    PalettePicker.tsx            # 7품사 팔레트 + POS_TOKEN_CLASS 색 매핑
  logic/
    checkTagging.ts              # token-by-token 비교 + 정확도
    checkTagging.test.ts
  content/
    index.ts                     # 5장 카드
  README.md
```

## 카드 풀 (5장, 난이도 1→5)

1. `고양이가 꽃을 본다` — 단문, 명사·조사·동사 (5 토큰)
2. `하늘이 매우 푸르다` — 형용사·부사 추가 (4 토큰)
3. `그 새 책을 골랐다` — 관형사 도입 (5 토큰)
4. `나는 빨리 학교에 간다` — 대명사·부사 (6 토큰)
5. `그는 그 작은 새를 멋지게 그렸다` — 7품사 종합 (8 토큰, "그" 대명사 vs 관형사 변별 포함)

## 토큰 단위 = 형태소

띄어쓰기 단위가 아닌 형태소 단위로 토큰을 분리. "고양이가" → "고양이"(명사) + "가"(조사). 콘텐츠 작성자가 직접 분리해서 카드 작성.

## 변별력 설계 (메모리 룰 반영)

- **답지 노출 X** — wrong 시 토큰별 정/오 강조 X. 정확도(`n/m`) 만 노출.
- **끼워맞추기 회피** — 학생이 전체를 재검토하도록 강제. 어느 토큰이 오답인지 모르므로 단순 토글 시도 불가.
- **시간 압박 X** — 무제한 시도. 오답 카운트는 FSRS rating 반영.
- **부분 점수** — 정확도 표시로 진척 보임, 좌절감 완화.

## 색깔 매핑

| 품사 | 색 (Tailwind) |
|---|---|
| 명사 | blue-100 / blue-800 |
| 대명사 | sky-100 / sky-800 |
| 동사 | emerald-100 / emerald-800 |
| 형용사 | amber-100 / amber-800 |
| 관형사 | slate-100 / slate-800 |
| 부사 | pink-100 / pink-800 |
| 조사 | purple-100 / purple-800 |

표준 Tailwind 팔레트 사용 — 디자인 시스템 토큰(`pullim-*`) 으로 통일은 디자이너 polish 시 일괄 조정.

## 비스코프 (V1+ 후보)

- 수사·감탄사 (V0 = 7품사만)
- 단어 의미 툴팁 (학생 어휘력 보조)
- 부분 채점 점수 → FSRS rating 세분화 (현재 binary)

## 트러블슈팅

- 메인페이지에 안 보임 → `bun run gen:registry` 실행 후 `registry.generated.ts` 확인
- "정답 확인" 비활성 → 모든 토큰이 태깅돼야 활성 (null 입력 = 미태깅)
