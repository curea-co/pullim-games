# 2026-05-13 — image-hotspot SVG 도식 정교화

## 목표
5개 식물 도식(꽃·잎·뿌리·줄기·씨앗) 을 **추상 도형 → 실제 식물 부위가 시각 식별 가능한 SVG** 로 polish. region bbox 좌표는 **보존** (학습 효과/난이도 유지).

## 트리거
- 2026-05-13: 사용자 요청 — "신규 3개 게임 디테일 중 image-hotspot SVG 정교화 부터 잡자".
- 2026-05-14 09:30 daily_outcome 종합: 본 plan §완료기준 4번 "이관 또는 image-hotspot PR에 반영 종결" → D4 결정점으로 신설.

## 메모리 룰
- 학습효과 > 중독성 → 도식 정교도는 부위 식별 가능 수준까지만 (over-engineering 금지)
- 하이퍼캐주얼 유지 → inline SVG, 외부 자산 X
- 답지 노출 + 끼워맞추기 회피 → region bbox 좌표 보존 (난이도 유지)

## 결정점

### D1 — 정교도 수준

옵션:
- **A (추천)** Lightweight illustrative inline SVG — 식물 부위 모양이 식별 가능한 단순 paths. 한 도식 100~150 lines. 색 + 윤곽선으로 단순 표현.
- B Full illustration — 디자이너 .svg 자산 import. V0 부담 ↑, 외부 자산 관리 부담.
- C 추상 유지 — 현재대로. 학생 시각 식별성 ↓.

→ **A 추천**: V0 학습 단계라 식별만 가능하면 충분. 정교한 일러스트는 V1+ 디자이너 polish.

### D2 — Region bbox 좌표

옵션:
- **A (추천)** 보존 — content/index.ts 의 bbox 좌표 유지. SVG 가 그 좌표에 맞춰 부위 위치 그림.
- B 재계산 — 새 도식에 맞춰 bbox 재정의. e2e 회귀 위험.

→ **A 추천**: 학습 의도/난이도 유지. SVG 만 정교화, 좌표는 그대로.

### D4 — image-hotspot 게임 PR 와의 관계 (2026-05-14 신설)

옵션:
- **A (채택)** image-hotspot 게임 PR 에 SVG polish commit 묶어서 한 PR 로 머지. 첫 출시부터 polish 반영, scope = image-hotspot 한 게임.
- B 게임 PR 머지 후 별 PR 로 polish (daily_outcome §예상블로커 권장안). PR 분리 명확, polish history 별 commit.
- C archive (polish 미진행). 어제 사용자 의지 미반영.

→ **A 채택**: (1) 어제 사용자 polish 의지 명확, (2) 게임 첫 출시 PR 에 추상 도식만 들어가면 학생 시각 식별성 ↓ → 첫 인상 손해, (3) trace 충돌 우려는 polish 가 다른 게임에도 영향 줄 때 발생 — image-hotspot 한 게임에 한정되므로 충돌 의미 작음, (4) e2e 회귀는 region bbox 보존(D2=A)으로 안전.

PR 분리 영향: daily_outcome §완료기준 1번 "신규 게임 3종 PR 3건" 그대로 유지 — image-hotspot PR 안에 polish commit 묶음.

### D3 — 5종 도식 polish 방향

각각 한 줄:

| 도식 | 현재 (V0) | polish 방향 (V0.1) |
|---|---|---|
| flower | 5장 꽃잎 (둘레 ellipse 회전) + 중앙 원 + V자 받침 | 꽃잎을 더 자연스러운 잎 모양 path 로 + 암술/수술 비주얼 차별화 |
| leaf | 큰 타원 + 직선 잎맥 + 잎자루 사각 | 잎끝이 뾰족한 비대칭 path + 깃털 모양 잎맥 곡선 |
| root | 굵은 직선 + 사선 곁뿌리 + 가닥 | 줄기와 뿌리 경계 (지표선) + 원뿌리 grad 굵기 + 곁뿌리 자연스러운 곡선 |
| stem (단면) | 동심원 4개 (외피→형성층→물관→체관) | 동심원 유지 + 물관/체관에 작은 점/방사선 텍스처 (관다발 시각화) |
| seed | 타원 + 반원 좌우 + 중앙 원 | 종피 텍스처 (점선/그라데이션) + 떡잎 두 쪽 음영 차이 + 배(중앙) 강조 |

## 작업 항목 (2026-05-14 — D1=A / D2=A / D4=A 채택 후 진행)

- [x] FlowerSvg polish — 꽃잎 5장 path (둥근 끝 + 좁은 base) + filament 수술 + Y stigma + 두 잎 꽃받침
- [x] LeafSvg polish — 잎끝 뾰족 비대칭 path + 곡선 중심맥 + 깃털 곁가지 4쌍 + 좁아지는 잎자루
- [x] RootSvg polish — 지표선(dash) + 줄기/원뿌리 path + 곁뿌리 곡선 4가지 + 뿌리털 9가닥
- [x] StemSvg polish — 동심원 4 + 외피 dash + 물관 관다발 8점 + 체관 중심 점
- [x] SeedSvg polish — 종피 점 텍스처 8개 + 떡잎 좌·우 음영 차이 + 배 중앙 + 어린 뿌리/싹 표시
- [x] e2e `viewport.spec` — image-hotspot 6/6 viewport PASS + chrome 1/1 = **7/7 PASS** (region bbox 보존 확인)
- [ ] 실기기 시각 확인 (모바일 320~390px) — 부위 식별 가능 여부 — 사용자 권한

## 비스코프

- 외부 일러스트 자산 (V1+ 디자이너)
- 실제 식물 사진/photo (V1+)
- region bbox 좌표 변경 (D2=A 결정)
- 다른 단원 추가 (인체 해부 등 → V1+ 별 game id)
- cloze-multi / letter-assembly polish (별 plan 또는 본 plan 외)

## 자가 검증 (2026-05-14)

- [x] `bun run typecheck` PASS
- [x] `bun run test` — 20 files, **147/147 PASS** (logic test 영향 없음, region 좌표 보존)
- [x] e2e `viewport.spec` — image-hotspot 6/6 viewport PASS + chrome.spec 1/1 = **7/7 PASS** (hydration mismatch 재발 X — `r2()` 부동소수점 round 유지)
- [ ] 실기기 — 학생이 5개 도식에서 부위 위치를 시각으로 식별 가능 (블라인드 학생 테스트는 V1+) — 사용자 권한

## 합의 후 진행

D1=A / D2=A 추천 그대로면 "추천대로 진행" → 5개 SVG polish 작업 시작. 다른 조합이면 본 plan 업데이트 후 진행.
