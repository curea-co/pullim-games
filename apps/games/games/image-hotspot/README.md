# 이미지 핫스팟 (image-hotspot)

- **gameId**: `image-hotspot`
- **과목 · 단원**: 과학 / 고1 과학 — 식물 구조 (꽃·잎·뿌리·줄기·씨앗 5장)
- **상태**: `available`
- **출처 plan**: [proc/plan/2026-05-13_20-game-mechanics-roadmap.md](../../../proc/plan/2026-05-13_20-game-mechanics-roadmap.md) M6

## 시작하기

1. **이 디렉토리만 작업하세요.** `apps/games/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3004/games/image-hotspot`
3. 테스트: `bun run test -- games/image-hotspot/`

## 핵심 명제

> **그림 위 영역(hotspot)에 라벨 카드를 매칭한다.**
> SVG 도식 위 N개 영역(bbox) + 라벨 카드 풀(정답 N + distractor).
> 카드 탭 = active → 영역 탭 = 배치. 영역 탭(occupied) = 풀 복귀.
> 정답 시 학생은 식물 부위 위치 + 명칭을 동시 학습.

## V0 단원 결정

plan §4 D2 추천("인체 해부") 에서 **식물 구조**로 변경:
- 사유: 인체 해부 V0 SVG 부담 ↑, 식물 5장이 같은 단원으로 학습 일관성 ↑
- 메커닉은 동일 — V1+ 별 game id 로 인체 해부, 한반도 지도 등 확장 가능

## 디렉토리

```
image-hotspot/
  manifest.ts                      # ✅ 자동 발견 대상
  schema.ts                        # ImageHotspotCardSchema + DIAGRAM_IDS enum
  component.tsx                    # 5-phase 상태머신
  components/
    PlantDiagram.tsx               # 5종 SVG 인라인 도식 (flower/leaf/root/stem/seed)
    HotspotCanvas.tsx              # 도식 + region overlay (절대좌표 bbox)
    LabelPalette.tsx               # 라벨 카드 풀 + active 강조
  logic/
    checkHotspot.ts                # region-by-region cardId 비교
    checkHotspot.test.ts
  content/
    index.ts                       # 5장 카드 — diagramId + regions[]
  README.md
```

## 카드 풀 (5장, 난이도 1→5)

| # | diagramId | region 수 | 라벨 (distractor) |
|---|---|---|---|
| 1 | flower | 4 | 꽃잎·암술·수술·꽃받침 (잎) |
| 2 | leaf | 3 | 잎몸·잎맥·잎자루 (뿌리) |
| 3 | root | 4 | 줄기·원뿌리·곁뿌리·뿌리털 (꽃잎) |
| 4 | stem | 4 | 외피·형성층·물관·체관 (뿌리) |
| 5 | seed | 3 | 종피·떡잎·배 (수술) |

## bbox 좌표 기준

- viewBox 200×200 SVG, `bbox.x/y/width/height` 는 **0~100 %** 정규화
- HotspotCanvas 가 `style: left/top/width/height = ${val}%` 로 절대 배치
- SVG `aspect-square` → 가로/세로 동일, % 좌표가 SVG 좌표와 1:1 매칭

## 변별력 설계

- **답지 노출 X** — wrong 시 영역별 정/오 강조 X. 정확도(`n/m`) 만.
- **끼워맞추기 회피** — distractor 1개 + 카드 자원 한정.
- 영역 박스 = 점선 (미배치) / 실선 (배치) — 학생 진행 시각 강조.

## 비스코프 (V1+)

- 정교한 일러스트 (현재 추상 도식) — 디자이너 일러스트 자산으로 교체
- 인체 해부, 한반도 지도, 곤충 신체 등 별 game id 로 확장 (같은 메커닉)
- 영역 hit-test 정밀화 (현재 단순 bbox — 비정형 polygon SVG `<path>` 으로 V1+ 확장)
