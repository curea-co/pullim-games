import type { BBox, DiagramId } from "../schema";
// Explicit compatibility mapping for the reviewed existing cards only.
// Button boxes are separate from anatomical anchors to avoid overlapping 44px hit areas.
type Callout = { bbox: BBox; point: [number, number] };
const box = (x: number, y: number, point: [number, number]): Callout => ({
  bbox: { x, y, width: 22, height: 22 },
  point,
});
const stem: Record<string, Callout> = {
  "r-outer": box(0, 0, [10, 50]),
  "r-phloem": box(78, 0, [50, 21]),
  "r-cambium": box(78, 78, [75, 50]),
  "r-xylem": box(0, 78, [50, 68]),
};
const root: Record<string, Callout> = {
  "r-stem-top": box(0, 0, [50, 12]),
  "r-main": box(0, 78, [50, 60]),
  "r-lateral": box(78, 0, [72, 52]),
  "r-hair": box(78, 78, [58, 66]),
};
const flower: Record<string, Callout> = {
  "r-petal": box(0, 0, [58, 26]),
  "r-pistil": box(78, 0, [50, 50]),
  "r-stamen": box(78, 78, [59.5, 55.5]),
  "r-sepal": box(0, 78, [44, 89]),
};
const seed: Record<string, Callout> = {
  "r-coat": box(0, 0, [10, 50]),
  "r-cotyledon": box(0, 78, [38, 50]),
  "r-embryo": box(78, 0, [50, 50]),
};
export function diagramCallout(
  cardId: string | undefined,
  diagramId: DiagramId,
  regionId: string,
): Callout | undefined {
  if (cardId === "card-001" && diagramId === "flower") return flower[regionId];
  if (cardId === "card-005" && diagramId === "seed") return seed[regionId];
  if (cardId === "card-004" && diagramId === "stem") return stem[regionId];
  if (cardId === "card-003" && diagramId === "root") return root[regionId];
  if (cardId === "image-hotspot-luna-batch-003" && diagramId === "root")
    return regionId === "r1"
      ? root["r-main"]
      : regionId === "r2"
        ? root["r-lateral"]
        : undefined;
}
export function correctedDiagramHint(
  cardId: string,
  diagramId: DiagramId,
  hint: string | undefined,
) {
  if (cardId === "card-004" && diagramId === "stem")
    return "이차 생장한 쌍떡잎식물 줄기의 모식도예요. 체관은 형성층 바깥, 물관은 안쪽에 있어요.";
  if (cardId === "card-003" && diagramId === "root")
    return "뿌리털은 뿌리 끝보다 위의 성숙한 부분에서 나와요.";
  if (
    diagramId === "seed" &&
    (cardId === "card-005" || cardId === "image-hotspot-luna-batch-005")
  )
    return "떡잎도 배의 일부예요. 초록색은 배에서 어린 싹과 뿌리가 될 부분을 나타내요.";
  return hint;
}
